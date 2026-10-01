type IconName =
  | "arrow"
  | "calendar"
  | "chevron"
  | "clock"
  | "location"
  | "menu"
  | "search"
  | "shield"
  | "spark"
  | "star"
  | "user"
  | "whistle";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

const paths: Record<IconName, React.ReactNode> = {
  arrow: <path d="m9 18 6-6-6-6m-4 6h10" />,
  calendar: <><path d="M8 2v4m8-4v4M3 9h18"/><rect x="3" y="4" width="18" height="17" rx="3"/></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  shield: <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
  spark: <path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9L12 3Zm6 11 .7 2.2L21 17l-2.3.8L18 20l-.7-2.2L15 17l2.3-.8L18 14Z" />,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-4 3.3-6 8-6s7.3 2 8 6"/></>,
  whistle: <><path d="M10 8h8l3 3v4a4 4 0 0 1-4 4h-4a5 5 0 0 1-5-5V9Z"/><path d="m10 8-5-3-2 3 5 4m10-4V5"/></>,
};

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" height={size} viewBox="0 0 24 24" width={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
      {paths[name]}
    </svg>
  );
}
