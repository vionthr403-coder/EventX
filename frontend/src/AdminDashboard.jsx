import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://eventx-s09g.onrender.com";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [dashboardResponse, teamsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/admin/dashboard`),
        axios.get(`${API_URL}/api/admin/teams`),
      ]);

      setDashboard(dashboardResponse.data);
      setTeams(teamsResponse.data);
    } catch (err) {
      console.error("Dashboard Error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load admin dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Loading EventX Admin Dashboard...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <h2>Dashboard Error</h2>
        <p>{error}</p>

        <button style={styles.refreshButton} onClick={loadDashboard}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>EVENTX 2026</h1>
          <p style={styles.subtitle}>
            Admin Dashboard — Ramco Institute of Technology
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadDashboard}>
          Refresh
        </button>
      </header>

      {/* STAT CARDS */}
      <div style={styles.cards}>
        <div style={styles.card}>
          <h3>Total Teams</h3>
          <strong>{dashboard?.totalTeams ?? 0}</strong>
        </div>

        <div style={styles.card}>
          <h3>Total Members</h3>
          <strong>{dashboard?.totalMembers ?? 0}</strong>
        </div>

        <div style={styles.card}>
          <h3>Total Registrations</h3>
          <strong>{dashboard?.totalRegistrations ?? 0}</strong>
        </div>
      </div>

      {/* EVENT STATISTICS */}
      <section style={styles.section}>
        <h2>Event Statistics</h2>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Registrations</th>
              </tr>
            </thead>

            <tbody>
              {dashboard?.eventStats?.map((event, index) => (
                <tr key={index}>
                  <td style={styles.td}>{event.event_name}</td>
                  <td style={styles.td}>{event.event_type}</td>
                  <td style={styles.td}>
                    {event.registrations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* TEAM DETAILS */}
      <section style={styles.section}>
        <h2>Registered Teams</h2>

        {teams.length === 0 ? (
          <p>No teams registered yet.</p>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Team ID</th>
                  <th style={styles.th}>Team Name</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Year</th>
                  <th style={styles.th}>Team Size</th>
                  <th style={styles.th}>Members</th>
                </tr>
              </thead>

              <tbody>
                {teams.map((team) => (
                  <tr key={team.team_id}>
                    <td style={styles.td}>
                      {team.unique_team_id}
                    </td>

                    <td style={styles.td}>
                      {team.team_name}
                    </td>

                    <td style={styles.td}>
                      {team.department}
                    </td>

                    <td style={styles.td}>
                      {team.year}
                    </td>

                    <td style={styles.td}>
                      {team.team_size}
                    </td>

                    <td style={styles.td}>
                      {team.members?.map((member, index) => (
                        <div
                          key={index}
                          style={styles.member}
                        >
                          <b>{member.name}</b>
                          <br />
                          {member.phone}
                          <br />
                          {member.email}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },

  header: {
    background: "#111827",
    color: "white",
    padding: "25px",
    borderRadius: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "25px",
  },

  title: {
    margin: 0,
    fontSize: "30px",
  },

  subtitle: {
    margin: "7px 0 0",
    opacity: 0.8,
  },

  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px",
    marginBottom: "30px",
  },

  card: {
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },

  section: {
    background: "white",
    padding: "25px",
    borderRadius: "15px",
    marginBottom: "30px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
  },

  tableContainer: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "15px",
  },

  th: {
    background: "#111827",
    color: "white",
    padding: "12px",
    textAlign: "left",
  },

  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "top",
  },

  member: {
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "1px solid #e5e7eb",
  },

  refreshButton: {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "11px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Arial, sans-serif",
  },
};

export default AdminDashboard;