require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ==========================================
// RESEND EMAIL
// ==========================================

const resend = new Resend(process.env.RESEND_API_KEY);

// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {
  res.send("EventX Backend Running!");
});

// ==========================================
// GET EVENTS
// ==========================================

app.get("/api/events", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        event_id,
        event_name,
        event_type,
        min_team_size,
        max_team_size,
        max_participants,
        is_active
      FROM events
      WHERE is_active = TRUE
      ORDER BY event_type, event_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Events Error:", error);

    res.status(500).json({
      message: "Failed to load events"
    });
  }
});

// ==========================================
// SEND EMAIL OTP
// ==========================================

app.post("/api/send-email-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    // Delete old OTP
    await pool.query(
      `
      DELETE FROM verifications
      WHERE email = $1
      `,
      [email]
    );

    // Save new OTP
    await pool.query(
      `
      INSERT INTO verifications
      (
        email,
        email_otp,
        email_verified,
        expires_at
      )
      VALUES ($1, $2, FALSE, $3)
      `,
      [email, otp, expiresAt]
    );

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: "EventX 2026 <onboarding@resend.dev>",
      to: [email],
      subject: "EventX 2026 - Email Verification OTP",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 20px;
        ">

          <h2 style="color:#1976d2;">
            EventX 2026
          </h2>

          <p>Hello,</p>

          <p>
            Your Email Verification OTP for
            <b>EventX 2026</b> is:
          </p>

          <div style="
            font-size:32px;
            font-weight:bold;
            letter-spacing:8px;
            padding:20px;
            background:#f1f7ff;
            text-align:center;
            color:#1976d2;
            border-radius:10px;
          ">
            ${otp}
          </div>

          <p>
            This OTP is valid for
            <b>5 minutes</b>.
          </p>

          <p>
            If you did not request this OTP,
            please ignore this email.
          </p>

          <hr>

          <p>
            <b>Ramco Institute of Technology</b><br>
            EventX 2026 Symposium
          </p>

        </div>
      `
    });

    if (error) {
      console.error("❌ Resend Error:", error);

      return res.status(500).json({
        message: "Failed to send OTP",
        error: error.message
      });
    }

    console.log("✅ OTP Email Sent Successfully");

    res.json({
      message: "OTP sent successfully"
    });

  } catch (error) {
    console.error("❌ Send OTP Error:", error);

    res.status(500).json({
      message: "Failed to send OTP",
      error: error.message
    });
  }
});

// ==========================================
// VERIFY EMAIL OTP
// ==========================================

app.post("/api/verify-email-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required"
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM verifications
      WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "OTP not found"
      });
    }

    const verification = result.rows[0];

    if (verification.email_otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    if (
      new Date() >
      new Date(verification.expires_at)
    ) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    await pool.query(
      `
      UPDATE verifications
      SET email_verified = TRUE
      WHERE verification_id = $1
      `,
      [verification.verification_id]
    );

    res.json({
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error("❌ Verify OTP Error:", error);

    res.status(500).json({
      message: "Failed to verify OTP"
    });
  }
});

// ==========================================
// REGISTER TEAM
// ==========================================

app.post("/api/register", async (req, res) => {

  const client = await pool.connect();

  try {

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
      members
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
        message: "Please fill all required fields"
      });
    }

    // Technical event
    if (
      !Array.isArray(technicalEvents) ||
      technicalEvents.length < 1
    ) {
      return res.status(400).json({
        message: "Select at least one technical event"
      });
    }

    // Non technical event
    if (
      !Array.isArray(nonTechnicalEvents) ||
      nonTechnicalEvents.length < 1
    ) {
      return res.status(400).json({
        message: "Select at least one non-technical event"
      });
    }

    if (!Array.isArray(members)) {
      return res.status(400).json({
        message: "Team members are required"
      });
    }

    if (members.length !== Number(teamSize)) {
      return res.status(400).json({
        message: "Team size and member count do not match"
      });
    }

    // Check email verification
    const verificationResult = await pool.query(
      `
      SELECT email_verified
      FROM verifications
      WHERE email = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [email]
    );

    if (
      verificationResult.rows.length === 0 ||
      !verificationResult.rows[0].email_verified
    ) {
      return res.status(400).json({
        message: "Please verify your email first"
      });
    }

    // Check members
    for (const member of members) {

      if (
        !member.name ||
        !member.phone ||
        !member.email
      ) {
        return res.status(400).json({
          message: "All team member details are required"
        });
      }
    }

    await client.query("BEGIN");

    // Duplicate team name
    const duplicateTeam = await client.query(
      `
      SELECT team_id
      FROM teams
      WHERE LOWER(team_name) = LOWER($1)
      `,
      [teamName]
    );

    if (duplicateTeam.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Team name already exists"
      });
    }

    // Unique team ID
    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    const uniqueTeamId =
      `EVX26-${randomNumber}`;

    // Insert team
    const teamResult = await client.query(
      `
      INSERT INTO teams
      (
        unique_team_id,
        team_name,
        department,
        year,
        college_name,
        team_size
      )
      VALUES
      ($1, $2, $3, $4, $5, $6)
      RETURNING team_id
      `,
      [
        uniqueTeamId,
        teamName,
        department,
        year,
        "Ramco Institute of Technology",
        teamSize
      ]
    );

    const teamId =
      teamResult.rows[0].team_id;

    // Insert members
    for (const member of members) {

      await client.query(
        `
        INSERT INTO team_members
        (
          team_id,
          name,
          phone,
          email,
          phone_verified,
          email_verified
        )
        VALUES
        ($1, $2, $3, $4, TRUE, TRUE)
        `,
        [
          teamId,
          member.name,
          member.phone,
          member.email
        ]
      );
    }

    // Combine events
    const allSelectedEvents = [
      ...technicalEvents,
      ...nonTechnicalEvents
    ];

    // Register events
    for (const eventName of allSelectedEvents) {

      const eventResult = await client.query(
        `
        SELECT
          event_id,
          event_type,
          min_team_size,
          max_team_size,
          max_participants
        FROM events
        WHERE event_name = $1
          AND is_active = TRUE
        `,
        [eventName]
      );

      if (eventResult.rows.length === 0) {
        throw new Error(
          `Event not found: ${eventName}`
        );
      }

      const event = eventResult.rows[0];

      // Team size validation
      if (
        Number(teamSize) <
          Number(event.min_team_size) ||
        Number(teamSize) >
          Number(event.max_team_size)
      ) {
        throw new Error(
          `${eventName} requires team size between ${event.min_team_size} and ${event.max_team_size}`
        );
      }

      // Capacity check
      const participantResult =
        await client.query(
          `
          SELECT
            COALESCE(
              SUM(t.team_size),
              0
            ) AS participants
          FROM registrations r
          JOIN teams t
            ON r.team_id = t.team_id
          WHERE r.event_id = $1
          `,
          [event.event_id]
        );

      const currentParticipants =
        Number(
          participantResult.rows[0]
            .participants
        );

      if (
        event.max_participants &&
        currentParticipants +
          Number(teamSize) >
          Number(event.max_participants)
      ) {
        throw new Error(
          `${eventName} is full`
        );
      }

      // Insert registration
      await client.query(
        `
        INSERT INTO registrations
        (
          team_id,
          event_id
        )
        VALUES
        ($1, $2)
        `,
        [
          teamId,
          event.event_id
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Registration successful",
      uniqueTeamId,
      teamId
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "❌ Registration Error:",
      error
    );

    res.status(500).json({
      message:
        error.message ||
        "Registration failed"
    });

  } finally {

    client.release();

  }
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================

app.get(
  "/api/admin/dashboard",
  async (req, res) => {

    try {

      const teamsResult =
        await pool.query(`
          SELECT COUNT(*) AS total_teams
          FROM teams
        `);

      const membersResult =
        await pool.query(`
          SELECT COUNT(*) AS total_members
          FROM team_members
        `);

      const registrationsResult =
        await pool.query(`
          SELECT COUNT(*) AS total_registrations
          FROM registrations
        `);

      const eventsResult =
        await pool.query(`
          SELECT
            e.event_name,
            e.event_type,
            COUNT(r.registration_id)
              AS registrations
          FROM events e
          LEFT JOIN registrations r
            ON e.event_id = r.event_id
          GROUP BY
            e.event_id,
            e.event_name,
            e.event_type
          ORDER BY
            e.event_type,
            e.event_name
        `);

      res.json({

        totalTeams:
          Number(
            teamsResult.rows[0]
              .total_teams
          ),

        totalMembers:
          Number(
            membersResult.rows[0]
              .total_members
          ),

        totalRegistrations:
          Number(
            registrationsResult.rows[0]
              .total_registrations
          ),

        eventStats:
          eventsResult.rows

      });

    } catch (error) {

      console.error(
        "❌ Dashboard Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load dashboard data"
      });
    }
  }
);

// ==========================================
// ADMIN TEAMS
// ==========================================

app.get(
  "/api/admin/teams",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
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
              )
              FILTER (
                WHERE tm.member_id
                IS NOT NULL
              ),
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

      console.error(
        "❌ Teams Error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to load teams"
      });
    }
  }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log(
    `EventX Backend running on http://localhost:${PORT}`
  );

});