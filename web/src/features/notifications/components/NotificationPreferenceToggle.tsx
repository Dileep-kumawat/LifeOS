import { Switch } from "../../../components/ui/Switch";

export interface NotificationPreferenceToggleProps {
  title: string;
  description?: string;
  push: boolean;
  inApp: boolean;
  onPushChange: (checked: boolean) => void;
  onInAppChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * One module row with independent push / in-app sub-toggles. Each toggle is a
 * discrete action — the caller saves immediately on change (no save button).
 */
export function NotificationPreferenceToggle({
  title,
  description,
  push,
  inApp,
  onPushChange,
  onInAppChange,
  disabled
}: NotificationPreferenceToggleProps) {
  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-[#000000]">{title}</span>
        {description && <span className="text-xs text-[#615d59]">{description}</span>}
      </div>

      <div className="flex items-center gap-6 pl-0.5">
        <span className="flex items-center gap-2">
          <Switch
            checked={push}
            disabled={disabled}
            onCheckedChange={onPushChange}
            aria-label={`${title}, push notifications`}
          />
          <span aria-hidden="true" className="text-xs text-[#615d59]">
            Push
          </span>
        </span>
        <span className="flex items-center gap-2">
          <Switch
            checked={inApp}
            disabled={disabled}
            onCheckedChange={onInAppChange}
            aria-label={`${title}, in-app notifications`}
          />
          <span aria-hidden="true" className="text-xs text-[#615d59]">
            In-app
          </span>
        </span>
      </div>
    </div>
  );
}