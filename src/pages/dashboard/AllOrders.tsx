import CRMOrders from "./crm/CRMOrders";

// Top-level "All Orders" view directly under Dashboard.
// Shows all orders (WooCommerce + WhatsApp) using the same component as CRM Orders.
export default function AllOrders() {
  return <CRMOrders />;
}
