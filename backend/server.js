require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// ===============================
// EMAIL CONFIGURATION
// ===============================

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Gmail SMTP Error:", error.message);
  } else {
    console.log("✅ Gmail SMTP Ready!");
  }
});

// ================= ADMIN DASHBOARD =================

// Dashboard summary
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const teamsResult = await pool.query(`
      SELECT COUNT(*) AS total_teams
      FROM teams
    `);

    const membersResult = await pool.query(`
      SELECT COUNT(*) AS total_members
      FROM team_members
    `);

    const registrationsResult = await pool.query(`
      SELECT COUNT(*) AS total_registrations
      FROM registrations
    `);

    const eventsResult = await pool.query(`
      SELECT
        e.event_name,
        e.event_type,
        COUNT(r.registration_id) AS registrations
      FROM events e
      LEFT JOIN registrations r
        ON e.event_id = r.event_id
      GROUP BY e.event_id, e.event_name, e.event_type
      ORDER BY e.event_type, e.event_name
    `);

    res.json({
      totalTeams: Number(teamsResult.rows[0].total_teams),
      totalMembers: Number(membersResult.rows[0].total_members),
      totalRegistrations: Number(
        registrationsResult.rows[0].total_registrations
      ),
      eventStats: eventsResult.rows,
    });

  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).json({
      message: "Failed to load dashboard data"
    });
  }
});


// Get all registered teams
app.get("/api/admin/teams", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        t.team_id,
        t.unique_team_id,
        t.team_name,
        t.department,
        t.year,
        t.team_size,
        t.college_name,
        t.created_at,

        COALESCE(
          json_agg(
            json_build_object(
              'name', tm.name,
              'phone', tm.phone,
              'email', tm.email
            )
          ) FILTER (WHERE tm.member_id IS NOT NULL),
          '[]'
        ) AS members

      FROM teams t

      LEFT JOIN team_members tm
        ON t.team_id = tm.team_id

      GROUP BY t.team_id

      ORDER BY t.created_at DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Teams Error:", error);

    res.status(500).json({
      message: "Failed to load teams"
    });
  }
});

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.json({
    message: "EventX Backend Running!",
  });
});


// ===============================
// GET EVENTS
// ===============================

app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM events ORDER BY event_id"
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch events",
    });
  }
});


// ===============================
// SEND EMAIL OTP
// ===============================

app.post("/api/send-email-otp", async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: "Email is required.",
    });
  }

  try {

    // Generate 6 digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // OTP expires after 5 minutes
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );


    // Remove old OTPs
    await pool.query(
      "DELETE FROM verifications WHERE email = $1",
      [email]
    );


    // Save OTP
    await pool.query(
      `INSERT INTO verifications
      (
        email,
        email_otp,
        email_verified,
        expires_at
      )
      VALUES ($1, $2, FALSE, $3)`,
      [
        email,
        otp,
        expiresAt,
      ]
    );


    // Send email
    await transporter.sendMail({

      from: process.env.EMAIL_USER,

      to: email,

      subject: "EventX Email Verification OTP",

      html: `
        <div style="font-family: Arial; padding: 20px;">

          <h2 style="color: #6c3cff;">
            EVENTX
          </h2>

          <h3>Email Verification</h3>

          <p>
            Your EventX verification OTP is:
          </p>

          <h1 style="letter-spacing: 8px;">
            ${otp}
          </h1>

          <p>
            This OTP is valid for 5 minutes.
          </p>

          <p>
            If you did not request this OTP,
            please ignore this email.
          </p>

          <hr>

          <p>
            Ramco Institute of Technology
          </p>

        </div>
      `,
    });


    res.json({
      message: "OTP sent successfully.",
    });


  } catch (error) {

    console.error("Email OTP Error:", error);

    res.status(500).json({
      error: "Failed to send OTP.",
    });
  }
});


// ===============================
// VERIFY EMAIL OTP
// ===============================

app.post("/api/verify-email-otp", async (req, res) => {

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      error: "Email and OTP are required.",
    });
  }


  try {

    const result = await pool.query(
      `SELECT *
       FROM verifications
       WHERE email = $1
       ORDER BY verification_id DESC
       LIMIT 1`,
      [email]
    );


    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "OTP not found. Please request a new OTP.",
      });
    }


    const verification = result.rows[0];


    // Check expiry
    if (
      new Date(verification.expires_at) < new Date()
    ) {

      return res.status(400).json({
        error: "OTP expired. Please request a new OTP.",
      });
    }


    // Check OTP
    if (verification.email_otp !== otp) {

      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }


    // Mark verified
    await pool.query(
      `UPDATE verifications
       SET email_verified = TRUE
       WHERE verification_id = $1`,
      [verification.verification_id]
    );


    res.json({
      message: "Email verified successfully.",
      verified: true,
    });


  } catch (error) {

    console.error("OTP Verification Error:", error);

    res.status(500).json({
      error: "OTP verification failed.",
    });
  }
});


// ===============================
// REGISTER TEAM
// ===============================

app.post("/api/register", async (req, res) => {

  const {
    name,
    phone,
    email,
    department,
    year,
    teamName,
    teamSize,
    technicalEvents,
    nonTechnicalEvents,
    members,
  } = req.body;


  // Basic validation
  if (
    !name ||
    !phone ||
    !email ||
    !department ||
    !year ||
    !teamName ||
    !teamSize
  ) {
    return res.status(400).json({
      error: "Please fill all required fields.",
    });
  }


  // Event validation
  if (!technicalEvents || technicalEvents.length < 1) {
    return res.status(400).json({
      error: "Select at least one Technical Event.",
    });
  }


  if (!nonTechnicalEvents || nonTechnicalEvents.length < 1) {
    return res.status(400).json({
      error: "Select at least one Non-Technical Event.",
    });
  }


  // Member validation
  if (
    !members ||
    members.length !== Number(teamSize)
  ) {
    return res.status(400).json({
      error: "Team member details are incomplete.",
    });
  }


  // Email verification
  const verificationResult = await pool.query(
    `SELECT email_verified
     FROM verifications
     WHERE email = $1
     ORDER BY verification_id DESC
     LIMIT 1`,
    [email]
  );


  if (
    verificationResult.rows.length === 0 ||
    verificationResult.rows[0].email_verified !== true
  ) {

    return res.status(400).json({
      error: "Please verify your email before registration.",
    });
  }


  for (const member of members) {

    if (
      !member.name ||
      !member.phone ||
      !member.email
    ) {

      return res.status(400).json({
        error: "Please fill all member details.",
      });
    }
  }


  const client = await pool.connect();


  try {

    await client.query("BEGIN");


    // Duplicate team name
    const existingTeam = await client.query(
      `SELECT team_id
       FROM teams
       WHERE LOWER(team_name) = LOWER($1)`,
      [teamName]
    );


    if (existingTeam.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "Team name already exists.",
      });
    }


    // Generate Team ID
    let uniqueTeamId;

    while (true) {

      const randomNumber =
        Math.floor(
          100000 + Math.random() * 900000
        );

      uniqueTeamId =
        `EVX26-${randomNumber}`;


      const checkId = await client.query(
        `SELECT team_id
         FROM teams
         WHERE unique_team_id = $1`,
        [uniqueTeamId]
      );


      if (checkId.rows.length === 0) {
        break;
      }
    }


    // Create team
    const teamResult = await client.query(
      `INSERT INTO teams
      (
        unique_team_id,
        team_name,
        department,
        year,
        team_size
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING team_id, unique_team_id`,
      [
        uniqueTeamId,
        teamName,
        department,
        year,
        teamSize,
      ]
    );


    const teamId =
      teamResult.rows[0].team_id;


    // Save members
    for (const member of members) {

      await client.query(
        `INSERT INTO team_members
        (
          team_id,
          name,
          phone,
          email,
          email_verified
        )
        VALUES ($1, $2, $3, $4, TRUE)`,
        [
          teamId,
          member.name,
          member.phone,
          member.email,
        ]
      );
    }


    // Combine events
    const selectedEvents = [
      ...technicalEvents,
      ...nonTechnicalEvents,
    ];


    // Register events
    for (const eventName of selectedEvents) {

      const eventResult = await client.query(
        `SELECT
          event_id,
          min_team_size,
          max_team_size
         FROM events
         WHERE event_name = $1
         AND is_active = TRUE`,
        [eventName]
      );


      if (eventResult.rows.length === 0) {

        throw new Error(
          `Event not found: ${eventName}`
        );
      }


      const event =
        eventResult.rows[0];


      // Team size validation
      if (
        Number(teamSize) <
          event.min_team_size ||
        Number(teamSize) >
          event.max_team_size
      ) {

        throw new Error(
          `${eventName} requires team size between ${event.min_team_size} and ${event.max_team_size}.`
        );
      }


      await client.query(
        `INSERT INTO registrations
        (
          team_id,
          event_id
        )
        VALUES ($1, $2)`,
        [
          teamId,
          event.event_id,
        ]
      );
    }


    await client.query("COMMIT");


    res.status(201).json({

      message:
        "Registration successful!",

      uniqueTeamId:
        uniqueTeamId,

      teamId:
        teamId,

    });


  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Registration Error:",
      error
    );


    res.status(500).json({
      error:
        error.message ||
        "Registration failed.",
    });


  } finally {

    client.release();

  }

});


// ===============================
// START SERVER
// ===============================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {

  console.log(
    `EventX Backend running on http://localhost:${PORT}`
  );

});