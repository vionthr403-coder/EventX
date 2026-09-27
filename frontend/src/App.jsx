import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

function App() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    department: "",
    year: "",
    teamName: "",
    teamSize: 1,
  });

  const [members, setMembers] = useState([
    {
      name: "",
      phone: "",
      email: "",
    },
  ]);

  const [technical, setTechnical] = useState([]);
  const [nonTechnical, setNonTechnical] = useState([]);

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const [registeredTeamId, setRegisteredTeamId] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "teamSize" ? Number(value) : value,
    }));

    if (name === "teamSize") {
      const size = Number(value);

      setMembers((prev) => {
        const updated = [...prev];

        while (updated.length < size) {
          updated.push({
            name: "",
            phone: "",
            email: "",
          });
        }

        return updated.slice(0, size);
      });
    }
  };

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

  const toggleTechnical = (eventName) => {
    setTechnical((prev) =>
      prev.includes(eventName)
        ? prev.filter((event) => event !== eventName)
        : [...prev, eventName]
    );
  };

  const toggleNonTechnical = (eventName) => {
    setNonTechnical((prev) =>
      prev.includes(eventName)
        ? prev.filter((event) => event !== eventName)
        : [...prev, eventName]
    );
  };

  // =========================
  // SEND EMAIL OTP
  // =========================
  const sendEmailOTP = async () => {
    if (!formData.email) {
      alert("Please enter email address.");
      return;
    }

    try {
      setOtpLoading(true);

      await axios.post(`${API_URL}/api/send-email-otp`, {
        email: formData.email,
      });

      setOtpSent(true);
      alert("OTP sent successfully to your email.");
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // =========================
  // VERIFY EMAIL OTP
  // =========================
  const verifyEmailOTP = async () => {
    if (!otp || otp.length !== 6) {
      alert("Please enter the 6-digit OTP.");
      return;
    }

    try {
      setOtpLoading(true);

      const response = await axios.post(
        `${API_URL}/api/verify-email-otp`,
        {
          email: formData.email,
          otp,
        }
      );

      if (response.data) {
        setEmailVerified(true);
        setOtpSent(false);
        alert("Email verified successfully!");
      }
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
          "Invalid or expired OTP."
      );
    } finally {
      setOtpLoading(false);
    }
  };

  // =========================
  // GENERATE RECEIPT PDF
  // =========================
  const generateReceipt = async (teamId) => {
    try {
      const qrData = await QRCode.toDataURL(teamId);

      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.text("EVENTX 2026", 105, 25, {
        align: "center",
      });

      doc.setFontSize(13);
      doc.text("Ramco Institute of Technology", 105, 35, {
        align: "center",
      });

      doc.setFontSize(18);
      doc.text("Registration Receipt", 105, 50, {
        align: "center",
      });

      doc.setFontSize(12);

      let y = 70;

      doc.text(`Team ID: ${teamId}`, 20, y);
      y += 10;

      doc.text(`Team Name: ${formData.teamName}`, 20, y);
      y += 10;

      doc.text(`Team Leader: ${formData.name}`, 20, y);
      y += 10;

      doc.text(`Email: ${formData.email}`, 20, y);
      y += 10;

      doc.text(`Phone: ${formData.phone}`, 20, y);
      y += 10;

      doc.text(`Department: ${formData.department}`, 20, y);
      y += 10;

      doc.text(`Year: ${formData.year}`, 20, y);
      y += 10;

      doc.text(`Team Size: ${formData.teamSize}`, 20, y);
      y += 15;

      doc.setFontSize(13);
      doc.text("Technical Events:", 20, y);
      y += 8;

      doc.setFontSize(11);

      technical.forEach((event) => {
        doc.text(`• ${event}`, 28, y);
        y += 7;
      });

      y += 5;

      doc.setFontSize(13);
      doc.text("Non-Technical Events:", 20, y);
      y += 8;

      doc.setFontSize(11);

      nonTechnical.forEach((event) => {
        doc.text(`• ${event}`, 28, y);
        y += 7;
      });

      // QR CODE
      doc.addImage(qrData, "PNG", 140, 70, 45, 45);

      doc.setFontSize(10);
      doc.text(
        "Please keep this receipt for future reference.",
        105,
        270,
        { align: "center" }
      );

      doc.save(`EventX_Receipt_${teamId}.pdf`);
    } catch (error) {
      console.error("Receipt Error:", error);
      alert("Failed to generate receipt.");
    }
  };

  // =========================
  // REGISTER
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!emailVerified) {
      alert("Please verify team leader email first.");
      return;
    }

    if (technical.length < 1) {
      alert("Please select at least 1 technical event.");
      return;
    }

    if (nonTechnical.length < 1) {
      alert("Please select at least 1 non-technical event.");
      return;
    }

    if (members.length !== Number(formData.teamSize)) {
      alert("Team member count does not match team size.");
      return;
    }

    for (let i = 0; i < members.length; i++) {
      if (
        !members[i].name ||
        !members[i].phone ||
        !members[i].email
      ) {
        alert(`Please fill all details for Member ${i + 1}.`);
        return;
      }
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/register`,
        {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          department: formData.department,
          year: Number(formData.year),
          teamName: formData.teamName,
          teamSize: Number(formData.teamSize),

          technicalEvents: technical,
          nonTechnicalEvents: nonTechnical,

          members,
        }
      );

      const teamId =
        response.data.uniqueTeamId ||
        response.data.teamId;

      setRegisteredTeamId(teamId);

      alert(
        `Registration successful!\n\nYour Team ID: ${teamId}`
      );

      await generateReceipt(teamId);
    } catch (error) {
      console.error("Registration Error:", error);

      alert(
        error.response?.data?.message ||
          "Registration failed. Please try again."
      );
    }
  };

  return (
    <div className="app">

      {/* ================= HEADER ================= */}
      <header className="header">

        <img
          src="/rit-logo.png"
          alt="Ramco Institute of Technology"
          className="rit-logo"
        />

        <h1>EVENTX 2026</h1>

        <p>Ramco Institute of Technology</p>

        <span>Symposium Registration</span>
      </header>

      {/* ================= MAIN ================= */}
      <main className="container">

        <form onSubmit={handleSubmit}>

          {/* PARTICIPANT DETAILS */}
          <section className="section">

            <h2>Participant Details</h2>

            <div className="form-grid">

              <div className="field">
                <label>Team Leader Name</label>

                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label>Phone Number</label>

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

                <label>Team Leader Email</label>

                <div className="email-otp-row">

                  <input
                    type="email"
                    name="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => {
                      handleChange(e);

                      setEmailVerified(false);
                      setOtpSent(false);
                      setOtp("");
                    }}
                    required
                  />

                  <button
                    type="button"
                    onClick={sendEmailOTP}
                    disabled={
                      otpLoading || emailVerified
                    }
                    className="otp-button"
                  >
                    {emailVerified
                      ? "EMAIL VERIFIED ✓"
                      : otpLoading
                      ? "SENDING..."
                      : "SEND OTP"}
                  </button>

                </div>

                {otpSent && !emailVerified && (
                  <div className="otp-box">

                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      maxLength="6"
                      onChange={(e) =>
                        setOtp(e.target.value)
                      }
                    />

                    <button
                      type="button"
                      onClick={verifyEmailOTP}
                      disabled={otpLoading}
                      className="verify-button"
                    >
                      {otpLoading
                        ? "VERIFYING..."
                        : "VERIFY OTP"}
                    </button>

                  </div>
                )}

                {emailVerified && (
                  <p className="verified-message">
                    ✓ Email verified successfully
                  </p>
                )}

              </div>

              <div className="field">
                <label>Department</label>

                <input
                  type="text"
                  name="department"
                  placeholder="Enter department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label>Year</label>

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
                    I Year
                  </option>

                  <option value="2">
                    II Year
                  </option>

                  <option value="3">
                    III Year
                  </option>

                  <option value="4">
                    IV Year
                  </option>
                </select>
              </div>

              <div className="field">
                <label>Team Name</label>

                <input
                  type="text"
                  name="teamName"
                  placeholder="Enter team name"
                  value={formData.teamName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field">
                <label>Team Size</label>

                <select
                  name="teamSize"
                  value={formData.teamSize}
                  onChange={handleChange}
                  required
                >
                  <option value="1">1 Member</option>
                  <option value="2">2 Members</option>
                  <option value="3">3 Members</option>
                  <option value="4">4 Members</option>
                  <option value="5">5 Members</option>
                </select>
              </div>

            </div>
          </section>

          {/* TEAM MEMBERS */}
          <section className="section">

            <h2>Team Members</h2>

            {members.map((member, index) => (

              <div
                className="member-card"
                key={index}
              >

                <h3>
                  Member {index + 1}
                  {index === 0
                    ? " (Team Leader)"
                    : ""}
                </h3>

                <div className="form-grid">

                  <div className="field">

                    <label>Name</label>

                    <input
                      type="text"
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

                  <div className="field">

                    <label>Phone</label>

                    <input
                      type="tel"
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

                  <div className="field full-width">

                    <label>Email</label>

                    <input
                      type="email"
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

          </section>

          {/* TECHNICAL EVENTS */}
          <section className="section">

            <h2>Technical Events</h2>

            <p>
              Select at least one technical event.
            </p>

            <div className="event-grid">

              {technicalEvents.map((event) => (

                <label
                  className={`event-card ${
                    technical.includes(event)
                      ? "selected"
                      : ""
                  }`}
                  key={event}
                >

                  <input
                    type="checkbox"
                    checked={technical.includes(event)}
                    onChange={() =>
                      toggleTechnical(event)
                    }
                  />

                  <span>{event}</span>

                </label>

              ))}

            </div>

          </section>

          {/* NON TECHNICAL EVENTS */}
          <section className="section">

            <h2>Non-Technical Events</h2>

            <p>
              Select at least one non-technical event.
            </p>

            <div className="event-grid">

              {nonTechnicalEvents.map((event) => (

                <label
                  className={`event-card ${
                    nonTechnical.includes(event)
                      ? "selected"
                      : ""
                  }`}
                  key={event}
                >

                  <input
                    type="checkbox"
                    checked={nonTechnical.includes(event)}
                    onChange={() =>
                      toggleNonTechnical(event)
                    }
                  />

                  <span>{event}</span>

                </label>

              ))}

            </div>

          </section>

          {/* REGISTER */}
          <section className="section submit-section">

            <button
              type="submit"
              className="register-button"
            >
              REGISTER FOR EVENTX 2026
            </button>

          </section>

        </form>

        {/* SUCCESS */}
        {registeredTeamId && (
          <section className="section success-section">

            <h2>Registration Successful 🎉</h2>

            <p>
              Your Team ID:
            </p>

            <strong>
              {registeredTeamId}
            </strong>

            <button
              type="button"
              onClick={() =>
                generateReceipt(registeredTeamId)
              }
              className="download-button"
            >
              Download Registration Receipt
            </button>

          </section>
        )}

      </main>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          © 2026 EventX | Ramco Institute of Technology
        </p>
      </footer>

    </div>
  );
}

export default App;