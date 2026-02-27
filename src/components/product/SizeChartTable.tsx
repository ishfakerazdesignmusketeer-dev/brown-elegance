interface SizeChartTableProps {
  categoryName?: string | null;
}

const PANJABI_HEADERS = ["Label Size", "Standard Size", "Length", "Chest", "Collar", "Sleeve Length"];
const PANJABI_ROWS = [
  ["S", "Size 40", "40", "40", "16.5", "23.25"],
  ["M", "Size 42", "42", "42", "17", "23.75"],
  ["L", "Size 44", "44", "44", "17.5", "24.25"],
  ["XL", "Size 46", "46", "46", "18", "24.25"],
];

const FLARE_HEADERS = ["Waist", "Length", "Leg Opening", "Thigh", "High"];
const FLARE_ROWS = [
  ["29", "39", "18", "25", "25.5"],
  ["30", "39", "17", "24", "25.5"],
  ["31", "39.5", "19", "26", "25.5"],
  ["32", "39.5", "18", "25", "25.5"],
  ["33", "40", "19", "26.5", "26.5"],
  ["34", "40", "19", "26.5", "26.5"],
  ["35", "40", "22", "28", "28"],
  ["36", "40", "21", "27", "28"],
];

const SizeChartTable = ({ categoryName }: SizeChartTableProps) => {
  const isFlare = categoryName
    ? /pant|flare/i.test(categoryName)
    : false;

  const title = isFlare ? "Flare Pant Size Chart" : "Size Chart";
  const headers = isFlare ? FLARE_HEADERS : PANJABI_HEADERS;
  const rows = isFlare ? FLARE_ROWS : PANJABI_ROWS;

  return (
    <div>
      <h3
        className="font-heading text-lg font-bold mb-4"
        style={{ color: "#2C1810" }}
      >
        {title}
      </h3>

      <div className="w-full overflow-auto rounded" style={{ border: "1px solid #E8E3DD" }}>
        <table className="w-full border-collapse" style={{ fontVariantNumeric: "tabular-nums" }}>
          <thead>
            <tr style={{ backgroundColor: "#2C1810" }}>
              {headers.map((h) => (
                <th
                  key={h}
                  className="font-body text-xs px-3 py-2.5 text-center whitespace-nowrap"
                  style={{ color: "#fff", fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                style={{
                  backgroundColor: ri % 2 === 0 ? "#FAFAF8" : "#fff",
                  borderBottom: "1px solid #E8E3DD",
                }}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className="font-body text-xs px-3 py-2 text-center whitespace-nowrap"
                    style={{
                      fontWeight: ci === 0 ? 700 : 400,
                      color: ci === 0 ? "#2C1810" : "#4A3728",
                      borderRight: "1px solid #E8E3DD",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        className="font-body mt-3"
        style={{ color: "#8B7355", fontSize: "11px", fontStyle: "italic" }}
      >
        All measurements are in inches.
      </p>
    </div>
  );
};

export default SizeChartTable;
