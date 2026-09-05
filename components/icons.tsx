/** Ícones do protótipo (SVG inline, sem dependência). */

export const IconResumo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
  </svg>
)

export const IconVendas = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M5 9.5 6.3 4h11.4L19 9.5" />
    <path d="M4.5 9.5h15L18.7 20H5.3L4.5 9.5Z" />
    <path d="M9 9.5a3 3 0 0 0 6 0" />
  </svg>
)

export const IconGastos = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M6 7h13.5l-1.4 9.3a2 2 0 0 1-2 1.7H8.6a2 2 0 0 1-2-1.7L5 4H2.5" />
    <circle cx="9" cy="21" r="1.1" />
    <circle cx="17" cy="21" r="1.1" />
  </svg>
)

export const IconProdutos = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 2.5c2 2.7 3 5 3 7.3a3 3 0 1 1-6 0c0-2.3 1-4.6 3-7.3Z" />
    <path d="M12 13v8.5M8 21.5h8" />
  </svg>
)

export const IconTrash = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M4 7h16M9 7V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V7m-8 0 .8 12.2A2 2 0 0 0 8.8 21h6.4a2 2 0 0 0 2-1.8L18 7" />
  </svg>
)

export const IconEdit = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const IconLogout = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </svg>
)
