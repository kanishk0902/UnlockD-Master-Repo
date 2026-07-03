interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

export function ToggleSwitch({ checked, onChange, label, hint }: ToggleSwitchProps) {
  return (
    <label className="toggle">
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        {hint && <span className="toggle__hint">{hint}</span>}
      </span>
      <span className="toggle__control">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle__track">
          <span className="toggle__thumb" />
        </span>
      </span>
    </label>
  );
}
