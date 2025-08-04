function Navbar() {
  return (
    <nav
      style={{
        background: "#111827",
        color: "#fff",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        position: "sticky",
        top: 0,
        zIndex: 10
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>CI/CD Log Dashboard</h1>
      <span style={{ fontSize: "14px", opacity: 0.7 }}>Powered by Firebase</span>
    </nav>
  );
}

export default Navbar;
