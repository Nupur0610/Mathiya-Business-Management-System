
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import { getToken } from "./services/auth";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import ShopOrders from "./pages/ShopOrders";
import Deliveries from "./pages/Deliveries";
import DeliveryRuns from "./pages/DeliveryRuns";
import Payments from "./pages/Payments";
import Shops from "./pages/Shops";
import Distributors from "./pages/Distributors";
import Reports from "./pages/Reports";
import Returns from "./pages/Returns";
import OpeningBalances from "./pages/OpeningBalances";
import DailyBalance from "./pages/DailyBalance";
import CashTransactions from "./pages/CashTransactions";
import StockAdjustments from "./pages/StockAdjustments";

function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken());

  useEffect(() => {
    const onExpired = () => setLoggedIn(false);
    window.addEventListener("auth-expired", onExpired);
    return () => window.removeEventListener("auth-expired", onExpired);
  }, []);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/shop-orders" element={<ShopOrders />} />
          <Route path="/deliveries" element={<Deliveries />} />
          <Route path="/delivery-runs" element={<DeliveryRuns />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/distributors" element={<Distributors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/opening-balances" element={<OpeningBalances />}/>
          <Route path="/daily-balance" element={<DailyBalance />}/>
          <Route
  path="/cash-transactions"
  element={<CashTransactions />}
/>
<Route
  path="/stock-adjustments"
  element={<StockAdjustments />}
/>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

