import { toast } from "sonner";

export type ApprovalNoticeStatus = "pending" | "rejected";

export const ADMIN_CONTACT_NUMBER = "01948695672";
export const ADMIN_WHATSAPP_URL =
  "https://wa.me/8801948695672?text=Assalamu%20alaikum%2C%20amar%20account%20approval%20pending.%20Please%20approve%20my%20account.";

export const PENDING_APPROVAL_MESSAGE =
  "Apnar account pending ase. Account approval korte user admin er sathe contact korun.";
export const PENDING_APPROVAL_DETAILS =
  "Admin WhatsApp/Call: 01948695672. Approved hole login korte parben.";
export const REJECTED_APPROVAL_MESSAGE =
  "Apnar account rejected hoyeche. Admin er sathe contact korun.";

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