require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

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
      message: "Unable to load events right now. Please try again."
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

    // --------------------------------------
    // BASIC VALIDATION
    // --------------------------------------

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
        message: "Please fill all required fields."
      });
    }

    // --------------------------------------
    // CLEAN INPUTS
    // --------------------------------------

    const cleanName = String(name).trim();
    const cleanPhone = String(phone).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanDepartment = String(department).trim();
    const cleanYear = String(year).trim();
    const cleanTeamName = String(teamName).trim();

    // --------------------------------------
    // NAME VALIDATION
    // --------------------------------------

    const nameRegex = /^[A-Za-z ]+$/;

    if (cleanName.length < 3) {
      return res.status(400).json({
        message: "Name must contain at least 3 letters."
      });
    }

    if (!nameRegex.test(cleanName)) {
      return res.status(400).json({
        message: "Name can contain only letters and spaces."
      });
    }

    // --------------------------------------
    // PHONE VALIDATION
    // --------------------------------------

    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        message: "Please enter a valid 10-digit mobile number."
      });
    }

    // --------------------------------------
    // EMAIL VALIDATION
    // --------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address."
      });
    }

    // --------------------------------------
    // TEAM NAME VALIDATION
    // --------------------------------------

    if (cleanTeamName.length < 2) {
      return res.status(400).json({
        message: "Team name must contain at least 2 characters."
      });
    }

    // --------------------------------------
    // TEAM SIZE VALIDATION
    // --------------------------------------

    const numericTeamSize = Number(teamSize);

    if (
      !Number.isInteger(numericTeamSize) ||
      numericTeamSize < 1
    ) {
      return res.status(400).json({
        message: "Please select a valid team size."
      });
    }

    // --------------------------------------
    // TECHNICAL EVENTS
    // --------------------------------------

    if (
      !Array.isArray(technicalEvents) ||
      technicalEvents.length < 1
    ) {
      return res.status(400).json({
        message: "Please select at least one technical event."
      });
    }

    // --------------------------------------
    // NON TECHNICAL EVENTS
    // --------------------------------------

    if (
      !Array.isArray(nonTechnicalEvents) ||
      nonTechnicalEvents.length < 1
    ) {
      return res.status(400).json({
        message: "Please select at least one non-technical event."
      });
    }

    // --------------------------------------
    // MEMBERS
    // --------------------------------------

    if (!Array.isArray(members)) {
      return res.status(400).json({
        message: "Please add all team members."
      });
    }

    if (members.length !== numericTeamSize) {
      return res.status(400).json({
        message: "Team size and member count do not match."
      });
    }

    // --------------------------------------
    // MEMBER DETAILS VALIDATION
    // --------------------------------------

    for (let i = 0; i < members.length; i++) {

      const member = members[i];

      if (
        !member ||
        !member.name ||
        !member.phone ||
        !member.email
      ) {
        return res.status(400).json({
          message: `Please fill all details for team member ${i + 1}.`
        });
      }

      const memberName = String(member.name).trim();
      const memberPhone = String(member.phone).trim();
      const memberEmail =
        String(member.email).trim().toLowerCase();

      // Member name

      if (memberName.length < 3) {
        return res.status(400).json({
          message:
            `Team member ${i + 1} name must contain at least 3 letters.`
        });
      }

      if (!nameRegex.test(memberName)) {
        return res.status(400).json({
          message:
            `Team member ${i + 1} name can contain only letters and spaces.`
        });
      }

      // Member phone

      if (!phoneRegex.test(memberPhone)) {
        return res.status(400).json({
          message:
            `Please enter a valid 10-digit mobile number for team member ${i + 1}.`
        });
      }

      // Member email

      if (!emailRegex.test(memberEmail)) {
        return res.status(400).json({
          message:
            `Please enter a valid email for team member ${i + 1}.`
        });
      }

      // Store cleaned values back

      member.name = memberName;
      member.phone = memberPhone;
      member.email = memberEmail;
    }

    // --------------------------------------
    // CHECK DUPLICATE MEMBER PHONE
    // --------------------------------------

    const memberPhones = members.map(
      (member) => member.phone
    );

    const uniquePhones = new Set(memberPhones);

    if (uniquePhones.size !== memberPhones.length) {
      return res.status(400).json({
        message:
          "The same mobile number cannot be used for multiple team members."
      });
    }

    // --------------------------------------
    // CHECK DUPLICATE MEMBER EMAIL
    // --------------------------------------

    const memberEmails = members.map(
      (member) => member.email
    );

    const uniqueEmails = new Set(memberEmails);

    if (uniqueEmails.size !== memberEmails.length) {
      return res.status(400).json({
        message:
          "The same email cannot be used for multiple team members."
      });
    }

    // --------------------------------------
    // START TRANSACTION
    // --------------------------------------

    await client.query("BEGIN");

    // --------------------------------------
    // DUPLICATE TEAM NAME
    // --------------------------------------

    const duplicateTeam = await client.query(
      `
        SELECT team_id
        FROM teams
        WHERE LOWER(team_name) = LOWER($1)
      `,
      [cleanTeamName]
    );

    if (duplicateTeam.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "This team name is already registered. Please choose another team name."
      });
    }

    // --------------------------------------
    // CHECK EXISTING MEMBER PHONE
    // --------------------------------------

    const existingPhone = await client.query(
      `
        SELECT member_id
        FROM team_members
        WHERE phone = ANY($1::text[])
      `,
      [memberPhones]
    );

    if (existingPhone.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "One or more mobile numbers are already registered."
      });
    }

    // --------------------------------------
    // CHECK EXISTING MEMBER EMAIL
    // --------------------------------------

    const existingEmail = await client.query(
      `
        SELECT member_id
        FROM team_members
        WHERE LOWER(email) = ANY($1::text[])
      `,
      [memberEmails]
    );

    if (existingEmail.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "One or more email addresses are already registered."
      });
    }

    // --------------------------------------
    // UNIQUE TEAM ID
    // --------------------------------------

    const randomNumber = Math.floor(
      100000 + Math.random() * 900000
    );

    const uniqueTeamId =
      `EVX26-${randomNumber}`;

    // --------------------------------------
    // INSERT TEAM
    // --------------------------------------

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
        cleanTeamName,
        cleanDepartment,
        cleanYear,
        "Ramco Institute of Technology",
        numericTeamSize
      ]
    );

    const teamId =
      teamResult.rows[0].team_id;

    // --------------------------------------
    // INSERT MEMBERS
    // --------------------------------------

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

    // --------------------------------------
    // COMBINE EVENTS
    // --------------------------------------

    const allSelectedEvents = [
      ...technicalEvents,
      ...nonTechnicalEvents
    ];

    // --------------------------------------
    // REMOVE DUPLICATE EVENTS
    // --------------------------------------

    const uniqueEvents = [
      ...new Set(allSelectedEvents)
    ];

    // --------------------------------------
    // REGISTER EVENTS
    // --------------------------------------

    for (const eventName of uniqueEvents) {

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
          `Event "${eventName}" is currently unavailable.`
        );
      }

      const event =
        eventResult.rows[0];

      // ------------------------------------
      // TEAM SIZE VALIDATION
      // ------------------------------------

      if (
        numericTeamSize <
          Number(event.min_team_size) ||
        numericTeamSize >
          Number(event.max_team_size)
      ) {

        throw new Error(
          `${eventName} requires a team size between ${event.min_team_size} and ${event.max_team_size}.`
        );
      }

      // ------------------------------------
      // CAPACITY CHECK
      // ------------------------------------

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
          numericTeamSize >
          Number(event.max_participants)
      ) {

        throw new Error(
          `${eventName} is currently full.`
        );
      }

      // ------------------------------------
      // INSERT REGISTRATION
      // ------------------------------------

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

    // --------------------------------------
    // COMMIT
    // --------------------------------------

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message:
        "Registration successful!",
      uniqueTeamId,
      teamId
    });

  } catch (error) {

    // --------------------------------------
    // ROLLBACK
    // --------------------------------------

    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Rollback Error:",
        rollbackError
      );
    }

    console.error(
      "❌ Registration Error:",
      error
    );

    // --------------------------------------
    // FRIENDLY DATABASE ERRORS
    // --------------------------------------

    if (error.code === "23505") {

      return res.status(400).json({
        message:
          "This information is already registered. Please check your details."
      });
    }

    if (error.code === "23503") {

      return res.status(400).json({
        message:
          "Some selected information is no longer available. Please refresh and try again."
      });
    }

    if (error.code === "42P01") {

      return res.status(500).json({
        message:
          "Registration service is not fully configured yet. Please contact the administrator."
      });
    }

    // --------------------------------------
    // GENERAL FRIENDLY ERROR
    // --------------------------------------

    res.status(500).json({
      message:
        "Registration could not be completed. Please try again in a moment."
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
          "Failed to load dashboard data."
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
          "Failed to load team information."
      });
    }
  }
);

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

  console.log(
    `EventX Backend running on port ${PORT}`
  );

});