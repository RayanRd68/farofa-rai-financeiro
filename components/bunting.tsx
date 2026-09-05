const COLORS = ["#C1502E", "#E8A93D", "#5B7A4C", "#2C6E7F", "#A13328"]

export function Bunting() {
  return (
    <div className="bunting" aria-hidden>
      {Array.from({ length: 26 }, (_, i) => (
        <span key={i} style={{ background: COLORS[i % COLORS.length] }} />
      ))}
    </div>
  )
}
