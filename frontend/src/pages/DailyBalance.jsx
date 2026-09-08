import { useEffect, useState } from "react";
import api from "../services/api";

function getTodayDate() {
  const now = new Date();

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
}

function getIndiaDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

function formatAmount(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

function DailyBalance() {
  const [date, setDate] = useState(getTodayDate());

  const [openingCash, setOpeningCash] = useState(0);
  const [openingGPay, setOpeningGPay] = useState(0);

  const [shopCash, setShopCash] = useState(0);
  const [shopGPay, setShopGPay] = useState(0);

  const [distributorCash, setDistributorCash] = useState(0);
  const [distributorGPay, setDistributorGPay] = useState(0);

  const [contributionCash, setContributionCash] = useState(0);
  const [contributionGPay, setContributionGPay] = useState(0);

  const [withdrawalCash, setWithdrawalCash] = useState(0);
  const [withdrawalGPay, setWithdrawalGPay] = useState(0);

  const [actualCash, setActualCash] = useState("");
  const [actualGPay, setActualGPay] = useState("");

  const [notes, setNotes] = useState("");

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage("");
      setError("");

      const [
        dailyBalancesResponse,
        paymentsResponse,
        cashTransactionsResponse,
        openingBalancesResponse,
      ] = await Promise.all([
        api.get("/daily-balances"),
        api.get("/payments"),
        api.get("/cash-transactions"),
        api.get("/opening-balances"),
      ]);

      const dailyBalances = dailyBalancesResponse.data || [];
      const payments = paymentsResponse.data || [];
      const cashTransactions =
        cashTransactionsResponse.data || [];
      const openingBalances =
        openingBalancesResponse.data || [];

      setHistory(dailyBalances);

      /*
       * Find the latest completed day before the selected day.
       * Its actual closing balance becomes today's opening balance.
       */
      const previousDays = dailyBalances
        .filter(
          (balance) =>
            getIndiaDate(balance.date) < date &&
            (balance.actualCash !== undefined ||
              balance.actualGPay !== undefined)
        )
        .sort(
          (a, b) =>
            new Date(b.date) - new Date(a.date)
        );

      const previousDay = previousDays[0];

      let calculatedOpeningCash = 0;
      let calculatedOpeningGPay = 0;

      if (previousDay) {
        calculatedOpeningCash = Number(
          previousDay.actualCash || 0
        );

        calculatedOpeningGPay = Number(
          previousDay.actualGPay || 0
        );
      } else {
        const cashOpening = openingBalances
          .filter(
            (balance) =>
              balance.type === "cash" &&
              getIndiaDate(balance.asOfDate) <= date
          )
          .sort(
            (a, b) =>
              new Date(b.asOfDate) -
              new Date(a.asOfDate)
          )[0];

        const gpayOpening = openingBalances
          .filter(
            (balance) =>
              balance.type === "gpay" &&
              getIndiaDate(balance.asOfDate) <= date
          )
          .sort(
            (a, b) =>
              new Date(b.asOfDate) -
              new Date(a.asOfDate)
          )[0];

        calculatedOpeningCash = Number(
          cashOpening?.amount || 0
        );

        calculatedOpeningGPay = Number(
          gpayOpening?.amount || 0
        );
      }

      setOpeningCash(calculatedOpeningCash);
      setOpeningGPay(calculatedOpeningGPay);

      /*
       * Calculate today's payments.
       */
      const selectedPayments = payments.filter(
        (payment) =>
          getIndiaDate(payment.paymentDate) === date
      );

      let cashShop = 0;
      let gpayShop = 0;
      let cashDistributor = 0;
      let gpayDistributor = 0;

      selectedPayments.forEach((payment) => {
        const amount = Number(payment.amount || 0);

        if (
          payment.partyType === "shop" &&
          payment.paymentMethod === "cash"
        ) {
          cashShop += amount;
        }

        if (
          payment.partyType === "shop" &&
          payment.paymentMethod === "gpay"
        ) {
          gpayShop += amount;
        }

        if (
          payment.partyType === "distributor" &&
          payment.paymentMethod === "cash"
        ) {
          cashDistributor += amount;
        }

        if (
          payment.partyType === "distributor" &&
          payment.paymentMethod === "gpay"
        ) {
          gpayDistributor += amount;
        }
      });

      setShopCash(cashShop);
      setShopGPay(gpayShop);
      setDistributorCash(cashDistributor);
      setDistributorGPay(gpayDistributor);

      /*
       * Calculate today's personal cash/GPay transactions.
       */
      const selectedTransactions =
        cashTransactions.filter(
          (transaction) =>
            getIndiaDate(transaction.transactionDate) ===
            date
        );

      let cashContribution = 0;
      let gpayContribution = 0;
      let cashWithdrawal = 0;
      let gpayWithdrawal = 0;

      selectedTransactions.forEach((transaction) => {
        const amount = Number(transaction.amount || 0);

        if (
          transaction.type === "personal_contribution" &&
          transaction.paymentMethod === "cash"
        ) {
          cashContribution += amount;
        }

        if (
          transaction.type === "personal_contribution" &&
          transaction.paymentMethod === "gpay"
        ) {
          gpayContribution += amount;
        }

        if (
          transaction.type === "personal_withdrawal" &&
          transaction.paymentMethod === "cash"
        ) {
          cashWithdrawal += amount;
        }

        if (
          transaction.type === "personal_withdrawal" &&
          transaction.paymentMethod === "gpay"
        ) {
          gpayWithdrawal += amount;
        }
      });

      setContributionCash(cashContribution);
      setContributionGPay(gpayContribution);
      setWithdrawalCash(cashWithdrawal);
      setWithdrawalGPay(gpayWithdrawal);

      /*
       * Calculate expected balances here so that
       * Actual Cash and Actual GPay can automatically
       * start with the expected amounts.
       */
      const calculatedExpectedCash =
        calculatedOpeningCash +
        cashShop +
        cashContribution -
        cashDistributor -
        cashWithdrawal;

      const calculatedExpectedGPay =
        calculatedOpeningGPay +
        gpayShop +
        gpayContribution -
        gpayDistributor -
        gpayWithdrawal;

      /*
       * If this day is already closed, load the saved
       * actual values. Otherwise automatically fill
       * actual balances with expected balances.
       */
      const existing = dailyBalances.find(
        (balance) =>
          getIndiaDate(balance.date) === date
      );

      if (existing) {
        setActualCash(
          existing.actualCash !== undefined
            ? String(existing.actualCash)
            : String(calculatedExpectedCash)
        );

        setActualGPay(
          existing.actualGPay !== undefined
            ? String(existing.actualGPay)
            : String(calculatedExpectedGPay)
        );

        setNotes(existing.notes || "");
      } else {
        setActualCash(String(calculatedExpectedCash));
        setActualGPay(String(calculatedExpectedGPay));
        setNotes("");
      }
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to load daily balance."
      );
    } finally {
      setLoading(false);
    }
  };

  const expectedCash =
    openingCash +
    shopCash +
    contributionCash -
    distributorCash -
    withdrawalCash;

  const expectedGPay =
    openingGPay +
    shopGPay +
    contributionGPay -
    distributorGPay -
    withdrawalGPay;

  const cashDifference =
    actualCash === ""
      ? null
      : Number(actualCash) - expectedCash;

  const gpayDifference =
    actualGPay === ""
      ? null
      : Number(actualGPay) - expectedGPay;

  const handleSave = async (e) => {
    e.preventDefault();

    if (actualCash === "" && actualGPay === "") {
      setError(
        "Enter at least the actual cash or actual GPay balance."
      );
      return;
    }

    if (actualCash !== "" && Number(actualCash) < 0) {
      setError("Actual cash cannot be negative.");
      return;
    }

    if (actualGPay !== "" && Number(actualGPay) < 0) {
      setError("Actual GPay cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const payload = {
        date,
        notes,
      };

      if (actualCash !== "") {
        payload.actualCash = Number(actualCash);
      }

      if (actualGPay !== "") {
        payload.actualGPay = Number(actualGPay);
      }

      await api.post("/daily-balances", payload);

      setMessage(
        "Daily balance saved successfully. Today's actual closing balance will become the next day's opening balance."
      );

      await loadData();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Failed to save daily balance."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-1">Daily Balance / Silaak</h2>

          <p className="text-muted mb-0">
            Close the day's cash and GPay balance after checking the
            actual amounts.
          </p>
        </div>

        <div style={{ minWidth: "180px" }}>
          <label className="form-label fw-semibold">
            Date
          </label>

          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {message && (
        <div className="alert alert-success">
          {message}
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" />

          <p className="text-muted mt-3">
            Loading daily balance...
          </p>
        </div>
      ) : (
        <>
          {/* Opening Balance */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-1">
                Today's Opening Balance
              </h5>

              <small className="text-muted">
                Previous day's actual closing balance.
              </small>
            </div>

            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <small className="text-muted">
                      Opening Cash
                    </small>

                    <h3 className="mb-0 mt-1">
                      {formatAmount(openingCash)}
                    </h3>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <small className="text-muted">
                      Opening GPay
                    </small>

                    <h3 className="mb-0 mt-1">
                      {formatAmount(openingGPay)}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Today's Transactions */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-1">
                Today's Transactions
              </h5>

              <small className="text-muted">
                These amounts are taken from Payments and Cash
                Transactions.
              </small>
            </div>

            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <h6>Cash</h6>

                    <div className="d-flex justify-content-between">
                      <span>Shop payments received</span>

                      <strong className="text-success">
                        +{formatAmount(shopCash)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Distributor payments</span>

                      <strong className="text-danger">
                        -{formatAmount(distributorCash)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Personal contribution</span>

                      <strong className="text-success">
                        +{formatAmount(contributionCash)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Personal withdrawal</span>

                      <strong className="text-danger">
                        -{formatAmount(withdrawalCash)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="border rounded p-3">
                    <h6>GPay</h6>

                    <div className="d-flex justify-content-between">
                      <span>Shop payments received</span>

                      <strong className="text-success">
                        +{formatAmount(shopGPay)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Distributor payments</span>

                      <strong className="text-danger">
                        -{formatAmount(distributorGPay)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Personal contribution</span>

                      <strong className="text-success">
                        +{formatAmount(contributionGPay)}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between">
                      <span>Personal withdrawal</span>

                      <strong className="text-danger">
                        -{formatAmount(withdrawalGPay)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expected Balance */}
          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">
                    System Expected Cash
                  </small>

                  <h2 className="mb-0 mt-1">
                    {formatAmount(expectedCash)}
                  </h2>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <small className="text-muted">
                    System Expected GPay
                  </small>

                  <h2 className="mb-0 mt-1">
                    {formatAmount(expectedGPay)}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Actual Closing Balance */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
              <h5 className="mb-1">
                Actual Closing Balance
              </h5>

              <small className="text-muted">
                Amounts are automatically filled from the expected
                balance. Edit them only if your actual counted amount
                is different.
              </small>
            </div>

            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Actual Cash
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        ₹
                      </span>

                      <input
                        type="number"
                        className="form-control"
                        value={actualCash}
                        onChange={(e) =>
                          setActualCash(e.target.value)
                        }
                        min="0"
                        step="0.01"
                        placeholder="Actual cash counted"
                      />
                    </div>

                    <small className="text-muted">
                      Expected: {formatAmount(expectedCash)}
                    </small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      Actual GPay
                    </label>

                    <div className="input-group">
                      <span className="input-group-text">
                        ₹
                      </span>

                      <input
                        type="number"
                        className="form-control"
                        value={actualGPay}
                        onChange={(e) =>
                          setActualGPay(e.target.value)
                        }
                        min="0"
                        step="0.01"
                        placeholder="Actual GPay balance"
                      />
                    </div>

                    <small className="text-muted">
                      Expected: {formatAmount(expectedGPay)}
                    </small>
                  </div>

                  {/* Cash Difference */}
                  <div className="col-md-6">
                    <div
                      className={`alert ${
                        cashDifference === null
                          ? "alert-secondary"
                          : cashDifference === 0
                          ? "alert-success"
                          : "alert-warning"
                      } mb-0`}
                    >
                      <div className="d-flex justify-content-between">
                        <strong>Cash Difference</strong>

                        <strong>
                          {cashDifference === null
                            ? "-"
                            : formatAmount(cashDifference)}
                        </strong>
                      </div>

                      {cashDifference !== null &&
                        cashDifference !== 0 && (
                          <small className="d-block mt-2">
                            This difference is recorded for
                            verification. It does not automatically
                            create a transaction.
                          </small>
                        )}
                    </div>
                  </div>

                  {/* GPay Difference */}
                  <div className="col-md-6">
                    <div
                      className={`alert ${
                        gpayDifference === null
                          ? "alert-secondary"
                          : gpayDifference === 0
                          ? "alert-success"
                          : "alert-warning"
                      } mb-0`}
                    >
                      <div className="d-flex justify-content-between">
                        <strong>GPay Difference</strong>

                        <strong>
                          {gpayDifference === null
                            ? "-"
                            : formatAmount(gpayDifference)}
                        </strong>
                      </div>

                      {gpayDifference !== null &&
                        gpayDifference !== 0 && (
                          <small className="d-block mt-2">
                            This difference is recorded for
                            verification.
                          </small>
                        )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="col-12">
                    <label className="form-label fw-semibold">
                      Closing Notes
                    </label>

                    <textarea
                      className="form-control"
                      rows="3"
                      value={notes}
                      onChange={(e) =>
                        setNotes(e.target.value)
                      }
                      placeholder="Example: ₹50 cash shortage, probably missed small expense"
                    />
                  </div>

                  {/* Save */}
                  <div className="col-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : "Save Daily Closing"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* History */}
          <div className="card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="mb-1">
                Previous Daily Balances
              </h5>

              <small className="text-muted">
                Actual closing balances recorded for previous days.
              </small>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Opening Cash</th>
                      <th>Expected Cash</th>
                      <th>Actual Cash</th>
                      <th>Cash Difference</th>
                      <th>Opening GPay</th>
                      <th>Expected GPay</th>
                      <th>Actual GPay</th>
                      <th>GPay Difference</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td
                          colSpan="9"
                          className="text-center py-4 text-muted"
                        >
                          No daily closing records yet.
                        </td>
                      </tr>
                    ) : (
                      history.map((balance) => (
                        <tr key={balance._id}>
                          <td>
                            {new Date(
                              balance.date
                            ).toLocaleDateString("en-IN")}
                          </td>

                          <td>
                            {formatAmount(
                              balance.openingCash
                            )}
                          </td>

                          <td>
                            {formatAmount(
                              balance.expectedCash
                            )}
                          </td>

                          <td>
                            {balance.actualCash !== undefined
                              ? formatAmount(
                                  balance.actualCash
                                )
                              : "-"}
                          </td>

                          <td>
                            {formatAmount(
                              balance.cashDifference
                            )}
                          </td>

                          <td>
                            {formatAmount(
                              balance.openingGPay
                            )}
                          </td>

                          <td>
                            {formatAmount(
                              balance.expectedGPay
                            )}
                          </td>

                          <td>
                            {balance.actualGPay !== undefined
                              ? formatAmount(
                                  balance.actualGPay
                                )
                              : "-"}
                          </td>

                          <td>
                            {formatAmount(
                              balance.gpayDifference
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DailyBalance;