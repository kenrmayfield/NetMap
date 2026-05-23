export function ClickableCell({
  className = "",
  onClick,
  value,
}: {
  className?: string;
  onClick: () => void;
  value: string | number | null;
}) {
  return (
    <span
      className={`clickable-cell ${className}`}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      {value ?? "-"}
    </span>
  );
}
