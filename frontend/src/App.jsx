import { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import "./App.css";

// Render backend URL
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const technicalEvents = [
  "Paper Presentation",
  "Web Development",
  "Debugging",
  "Technical Quiz",
];

const nonTechnicalEvents = [
  "Connections",
  "Treasure Hunt",
  "IPL Auction",
  "Fun Quiz",
];

const createMembers = (size) => {
  return Array.from({ length: Number(size) }, () => ({
    name: "",
    phone: "",
    email: "",
  }));
};

function App() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    department: "",
    year: "",
    teamName: "",
    teamSize: "1",
  });

  const [members, setMembers] = useState(createMembers(1));

  const [technical, setTechnical] = useState([]);
  const [nonTechnical, setNonTechnical] = useState([]);

  const [loading, setLoading] = useState(false);

  // Email verification
  const [emailVerified, setEmailVerified] = useState(false);

  // -----------------------------
  // FORM CHANGE
  // -----------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Team size change
    if (name === "teamSize") {
      setMembers(createMembers(value));
    }
  };

  // -----------------------------
  // MEMBER CHANGE
  // -----------------------------
  const handleMemberChange = (index, field, value) => {
    setMembers((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  };

  // -----------------------------
  // EVENT CHANGE
  // -----------------------------
  const handleEventChange = (eventName, type) => {
    if (type === "technical") {
      setTechnical((prev) =>
        prev.includes(eventName)
          ? prev.filter((event) => event !== eventName)
          : [...prev, eventName]
      );
    } else {
      setNonTechnical((prev) =>
        prev.includes(eventName)
          ? prev.filter((event) => event !== eventName)
          : [...prev, eventName]
      );
    }
  };

  // -----------------------------
  // VERIFY EMAIL
  // -----------------------------
  const verifyEmailNow = () => {
    if (!formData.email) {
      alert("Please enter your email address.");
      return;
    }

    if (!formData.email.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    setEmailVerified(true);

    alert("Email verified successfully! ✅");
  };

  // -----------------------------
  // GENERATE RECEIPT
  // -----------------------------
  const generateReceipt = async (teamId) => {
    try {
      const qrData = `
EVENTX - SYMPOSIUM 2026
Ramco Institute of Technology
Team ID: ${teamId}
Team Name: ${formData.teamName}
Leader: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}
`;

      // Generate QR Code
      const qrImage = await QRCode.toDataURL(qrData, {
        width: 250,
        margin: 2,
      });

      // Create PDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");

      doc.text("RAMCO INSTITUTE OF TECHNOLOGY", 105, 20, {
        align: "center",
      });

      doc.setFontSize(24);

      doc.text("EVENTX", 105, 32, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");

      doc.text("SYMPOSIUM 2026", 105, 41, {
        align: "center",
      });

      // Line
      doc.line(15, 48, 195, 48);

      // Receipt title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");

      doc.text("REGISTRATION RECEIPT", 105, 60, {
        align: "center",
      });

      // Team ID
      doc.setFontSize(14);

      doc.text("Team ID:", 20, 75);

      doc.setFont("helvetica", "normal");

      doc.text(teamId, 55, 75);

      // Participant details
      doc.setFont("helvetica", "bold");

      doc.text("Team Details", 20, 90);

      doc.setFont("helvetica", "normal");

      doc.text(`Team Name: ${formData.teamName}`, 20, 100);
      doc.text(`Team Leader: ${formData.name}`, 20, 110);
      doc.text(`Phone: ${formData.phone}`, 20, 120);
      doc.text(`Email: ${formData.email}`, 20, 130);
      doc.text(`Department: ${formData.department}`, 20, 140);
      doc.text(`Year: ${formData.year}`, 20, 150);
      doc.text(`Team Size: ${formData.teamSize}`, 20, 160);

      // QR Code
      doc.addImage(
        qrImage,
        "PNG",
        145,
        75,
        45,
        45
      );

      // Members
      let y = 175;

      doc.setFont("helvetica", "bold");

      doc.text("Team Members", 20, y);

      y += 10;

      doc.setFont("helvetica", "normal");

      members.forEach((member, index) => {
        doc.text(
          `${index + 1}. ${member.name} | ${member.phone}`,
          20,
          y
        );

        y += 8;
      });

      // Technical Events
      y += 8;

      doc.setFont("helvetica", "bold");

      doc.text("Technical Events", 20, y);

      y += 8;

      doc.setFont("helvetica", "normal");

      technical.forEach((event) => {
        doc.text(`• ${event}`, 25, y);

        y += 7;
      });

      // Non Technical Events
      y += 5;

      doc.setFont("helvetica", "bold");

      doc.text("Non-Technical Events", 20, y);

      y += 8;

      doc.setFont("helvetica", "normal");

      nonTechnical.forEach((event) => {
        doc.text(`• ${event}`, 25, y);

        y += 7;
      });

      // Footer
      y += 10;

      doc.line(15, y, 195, y);

      y += 10;

      doc.setFontSize(10);

      doc.text(
        "Please keep this receipt for future reference.",
        105,
        y,
        {
          align: "center",
        }
      );

      doc.text(
        "EventX • Ramco Institute of Technology • 2026",
        105,
        y + 7,
        {
          align: "center",
        }
      );

      // Download PDF
      doc.save(`EventX_Registration_${teamId}.pdf`);
    } catch (error) {
      console.error("Receipt generation error:", error);

      alert(
        "Registration completed, but PDF generation failed."
      );
    }
  };

  // -----------------------------
  // SUBMIT REGISTRATION
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email verification check
    if (!emailVerified) {
      alert("Please verify your email before registration.");
      return;
    }

    // Technical event check
    if (technical.length === 0) {
      alert(
        "Please select at least one Technical Event."
      );
      return;
    }

    // Non-technical event check
    if (nonTechnical.length === 0) {
      alert(
        "Please select at least one Non-Technical Event."
      );
      return;
    }

    // Team size check
    if (!formData.teamSize) {
      alert("Please select team size.");
      return;
    }

    // Member validation
    for (let i = 0; i < members.length; i++) {
      if (
        !members[i].name ||
        !members[i].phone ||
        !members[i].email
      ) {
        alert(
          `Please fill all details for Member ${i + 1}.`
        );
        return;
      }
    }

    try {
      setLoading(true);

      // IMPORTANT:
      // Uses Render backend in deployment
      const response = await axios.post(
        `${API_URL}/api/register`,
        {
          ...formData,
          technicalEvents: technical,
          nonTechnicalEvents: nonTechnical,
          members: members,
        }
      );

      const teamId = response.data.uniqueTeamId;

      alert(
        `Registration Successful! 🎉\n\nYour Team ID: ${teamId}`
      );

      await generateReceipt(teamId);

      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        department: "",
        year: "",
        teamName: "",
        teamSize: "1",
      });

      setMembers(createMembers(1));

      setTechnical([]);
      setNonTechnical([]);

      setEmailVerified(false);
    } catch (error) {
      console.error("Registration Error:", error);

      alert(
        error.response?.data?.error ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      {/* =====================================
          HEADER
          ===================================== */}
      <header className="header">

        <div className="college-name">
          RAMCO INSTITUTE OF TECHNOLOGY
        </div>

        <h1>EVENTX</h1>

        <p className="symposium">
          SYMPOSIUM 2026
        </p>

        <p className="tagline">
          Innovate • Compete • Conquer
        </p>

      </header>

      {/* =====================================
          MAIN
          ===================================== */}
      <main className="container">

        <form onSubmit={handleSubmit}>

          {/* =====================================
              PARTICIPANT DETAILS
              ===================================== */}
          <section className="section">

            <h2>Participant Details</h2>

            <div className="form-grid">

              {/* NAME */}
              <div className="field">

                <label>
                  Team Leader Name
                </label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* PHONE */}
              <div className="field">

                <label>
                  Team Leader Phone
                </label>

                <input
                  type="tel"
                  name="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* EMAIL */}
              <div className="field full-width">

                <label>
                  Team Leader Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => {
                    handleChange(e);
                    setEmailVerified(false);
                  }}
                  required
                />

                {/* VERIFY EMAIL BUTTON */}
                <button
                  type="button"
                  onClick={verifyEmailNow}
                  disabled={emailVerified}
                  className="otp-button"
                >
                  {emailVerified
                    ? "EMAIL VERIFIED ✓"
                    : "VERIFY EMAIL"}
                </button>

                {/* VERIFIED MESSAGE */}
                {emailVerified && (
                  <p className="verified-message">
                    ✓ Email verified successfully
                  </p>
                )}

              </div>

              {/* DEPARTMENT */}
              <div className="field">

                <label>
                  Department
                </label>

                <input
                  type="text"
                  name="department"
                  placeholder="Example: MCA"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* YEAR */}
              <div className="field">

                <label>
                  Year
                </label>

                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                >

                  <option value="">
                    Select Year
                  </option>

                  <option value="1">
                    1st Year
                  </option>

                  <option value="2">
                    2nd Year
                  </option>

                  <option value="3">
                    3rd Year
                  </option>

                  <option value="4">
                    4th Year
                  </option>

                </select>

              </div>

              {/* TEAM NAME */}
              <div className="field">

                <label>
                  Team Name
                </label>

                <input
                  type="text"
                  name="teamName"
                  placeholder="Enter unique team name"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                />

              </div>

              {/* TEAM SIZE */}
              <div className="field">

                <label>
                  Team Size
                </label>

                <select
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleChange}
                  required
                >

                  <option value="1">
                    1 Member
                  </option>

                  <option value="2">
                    2 Members
                  </option>

                  <option value="3">
                    3 Members
                  </option>

                  <option value="4">
                    4 Members
                  </option>

                  <option value="5">
                    5 Members
                  </option>

                </select>

              </div>

            </div>
          </section>

          {/* =====================================
              TEAM MEMBERS
              ===================================== */}
          <section className="section">

            <h2>
              Team Members
            </h2>

            <p className="section-info">
              Enter details of all team members.
            </p>

            <div className="members-container">

              {members.map((member, index) => (

                <div
                  className="member-card"
                  key={index}
                >

                  <h3>
                    Member {index + 1}
                    {index === 0 &&
                      " (Team Leader)"}
                  </h3>

                  <div className="form-grid">

                    {/* MEMBER NAME */}
                    <div className="field">

                      <label>
                        Name
                      </label>

                      <input
                        type="text"
                        placeholder="Member name"
                        value={member.name}
                        onChange={(e) =>
                          handleMemberChange(
                            index,
                            "name",
                            e.target.value
                          )
                        }
                        required
                      />

                    </div>

                    {/* MEMBER PHONE */}
                    <div className="field">

                      <label>
                        Phone
                      </label>

                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={member.phone}
                        onChange={(e) =>
                          handleMemberChange(
                            index,
                            "phone",
                            e.target.value
                          )
                        }
                        required
                      />

                    </div>

                    {/* MEMBER EMAIL */}
                    <div className="field full-width">

                      <label>
                        Email
                      </label>

                      <input
                        type="email"
                        placeholder="Email address"
                        value={member.email}
                        onChange={(e) =>
                          handleMemberChange(
                            index,
                            "email",
                            e.target.value
                          )
                        }
                        required
                      />

                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

          {/* =====================================
              TECHNICAL EVENTS
              ===================================== */}
          <section className="section">

            <h2>
              Technical Events
            </h2>

            <p className="section-info">
              Select at least one technical event.
            </p>

            <div className="event-grid">

              {technicalEvents.map((event) => (

                <label
                  className="event-option"
                  key={event}
                >

                  <input
                    type="checkbox"
                    checked={technical.includes(event)}
                    onChange={() =>
                      handleEventChange(
                        event,
                        "technical"
                      )
                    }
                  />

                  <span>
                    {event}
                  </span>

                </label>

              ))}

            </div>

          </section>

          {/* =====================================
              NON TECHNICAL EVENTS
              ===================================== */}
          <section className="section">

            <h2>
              Non-Technical Events
            </h2>

            <p className="section-info">
              Select at least one non-technical event.
            </p>

            <div className="event-grid">

              {nonTechnicalEvents.map((event) => (

                <label
                  className="event-option"
                  key={event}
                >

                  <input
                    type="checkbox"
                    checked={nonTechnical.includes(event)}
                    onChange={() =>
                      handleEventChange(
                        event,
                        "nonTechnical"
                      )
                    }
                  />

                  <span>
                    {event}
                  </span>

                </label>

              ))}

            </div>

          </section>

          {/* =====================================
              REGISTER BUTTON
              ===================================== */}
          <div className="submit-area">

            <button
              type="submit"
              className="register-button"
              disabled={loading}
            >
              {loading
                ? "REGISTERING..."
                : "REGISTER NOW"}
            </button>

          </div>

        </form>

      </main>

      {/* =====================================
          FOOTER
          ===================================== */}
      <footer className="footer">

        <p>
          © 2026 EventX • Ramco Institute of Technology
        </p>

        <p>
          Innovate • Compete • Conquer
        </p>

      </footer>

    </div>
  );
}

