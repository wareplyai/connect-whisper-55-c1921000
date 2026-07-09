import { toast } from "sonner";

export type ApprovalNoticeStatus = "pending" | "rejected";

export const ADMIN_CONTACT_NUMBER = "01948695672";
export const ADMIN_WHATSAPP_URL =
  "https://wa.me/8801948695672?text=Hello%20Admin%2C%20I%20just%20signed%20up%20and%20I%20want%20to%20purchase%20a%20plan%20right%20now.%20Please%20approve%20my%20account%20instantly%20so%20I%20can%20continue.";

export const PENDING_APPROVAL_MESSAGE =
  "Hello Admin, I want to purchase a plan right now — please approve my account instantly so I can continue.";
export const PENDING_APPROVAL_DETAILS =
  "Contact admin on WhatsApp/Call: 01948695672 to get approved. Note: after approval, if you don't choose a plan within 30 minutes, your account will be deactivated automatically.";
export const REJECTED_APPROVAL_MESSAGE =
  "Your account has been rejected. Please contact the admin.";

const STORAGE_KEY = "account-approval-notice";

export const saveApprovalNotice = (status: ApprovalNoticeStatus = "pending") => {
  window.sessionStorage.setItem(STORAGE_KEY, status);
};

export const takeApprovalNotice = (): ApprovalNoticeStatus | null => {
  const value = window.sessionStorage.getItem(STORAGE_KEY);
  window.sessionStorage.removeItem(STORAGE_KEY);
  return value === "pending" || value === "rejected" ? value : null;
};

export const showApprovalToast = (status: ApprovalNoticeStatus = "pending") => {
  const isRejected = status === "rejected";
  toast.error(isRejected ? REJECTED_APPROVAL_MESSAGE : PENDING_APPROVAL_MESSAGE, {
    description: isRejected ? `WhatsApp/Call: ${ADMIN_CONTACT_NUMBER}` : PENDING_APPROVAL_DETAILS,
    duration: 15000,
    action: {
      label: "WhatsApp",
      onClick: () => window.open(ADMIN_WHATSAPP_URL, "_blank", "noopener,noreferrer"),
    },
  });
};