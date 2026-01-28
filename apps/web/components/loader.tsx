// components/Loader.tsx
export function Loader() {
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "8px 12px",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        zIndex: 9999,
        pointerEvents: "none",
        border: "1px solid rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          border: "2px solid #f3f3f3",
          borderTop: "2px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <span
        style={{
          color: "#374151",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Updating Layers...
      </span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
