import { NavLink, Outlet } from "react-router-dom";

function MainLayout() {
  const navClass = ({ isActive }) =>
    `nav-link ${
      isActive
        ? "active bg-secondary text-white"
        : "text-white"
    }`;

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar */}
      <aside
        className="bg-dark text-white p-3"
        style={{ width: "250px" }}
      >
        <div className="mb-4">
          <h4 className="mb-1">Mathiya</h4>
          <small className="text-secondary">
            Business Management
          </small>
        </div>

        <nav className="nav flex-column gap-1">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>

          <NavLink to="/products" className={navClass}>
            Products & Stock
          </NavLink>

          <NavLink
            to="/stock-adjustments"
            className={navClass}
          >
            Stock Adjustments
          </NavLink>

          <NavLink
            to="/opening-balances"
            className={navClass}
          >
            Opening Balances
          </NavLink>

          <NavLink to="/purchases" className={navClass}>
            Purchases
          </NavLink>

          <NavLink to="/shop-orders" className={navClass}>
            Shop Orders
          </NavLink>

          <NavLink to="/deliveries" className={navClass}>
            Deliveries
          </NavLink>

          <NavLink
            to="/delivery-runs"
            className={navClass}
          >
            Delivery Runs
          </NavLink>

          <NavLink to="/payments" className={navClass}>
            Payments
          </NavLink>

          <NavLink to="/shops" className={navClass}>
            Shops
          </NavLink>

          <NavLink to="/distributors" className={navClass}>
            Distributors
          </NavLink>

          <NavLink
            to="/cash-transactions"
            className={navClass}
          >
            Cash Transactions
          </NavLink>

          <NavLink
            to="/daily-balance"
            className={navClass}
          >
            Daily Balance
          </NavLink>

          <NavLink to="/returns" className={navClass}>
            Returns
          </NavLink>

          <NavLink to="/reports" className={navClass}>
            Reports
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-grow-1">
        {/* Top Header */}
        <header className="bg-white border-bottom px-4 py-3">
          <h5 className="mb-0">
            Mathiya Business Management System
          </h5>
        </header>

        {/* Current Page */}
        <main className="p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;