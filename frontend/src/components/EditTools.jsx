import { Children, useEffect, useRef, useState } from "react";
import api from "../services/api";

// Date in India time as yyyy-mm-dd (for <input type="date">)
export function indiaDate(date) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(date));
}

export function errorMessage(err, fallback) {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    fallback
  );
}

/* ------------------------------------------------------------------
   Button shown at the top of a page. Click it to switch the
   Edit / Delete buttons on or off for every row in the tables.
------------------------------------------------------------------ */
export function EditToggle({ editMode, setEditMode }) {
  return (
    <button
      type="button"
      className={
        editMode ? "btn btn-warning" : "btn btn-outline-secondary"
      }
      onClick={() => setEditMode(!editMode)}
    >
      {editMode ? "✔ Done Editing" : "✏️ Edit Entries"}
    </button>
  );
}

/* Table cells --------------------------------------------------- */
export function ActionsHeader({ editMode }) {
  if (!editMode) {
    return null;
  }

  return <th className="text-nowrap">Actions</th>;
}

export function ActionsCell({ editMode, onEdit, onDelete }) {
  if (!editMode) {
    return null;
  }

  return (
    <td className="text-nowrap">
      <button
        type="button"
        className="btn btn-sm btn-outline-primary me-2"
        onClick={onEdit}
      >
        Edit
      </button>

      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        onClick={onDelete}
      >
        Delete
      </button>
    </td>
  );
}

/* Delete with a confirmation question --------------------------- */
export async function deleteEntry({ path, id, label, onDone }) {
  const confirmed = window.confirm(
    `Delete this ${label}?\n\nThis cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await api.delete(`${path}/${id}`);

    if (onDone) {
      await onDone();
    }
  } catch (err) {
    window.alert(
      errorMessage(err, `Failed to delete the ${label}.`)
    );
  }
}

/* ------------------------------------------------------------------
   Pop-up window to edit one entry.

   path          e.g. "/payments"  (the entry is saved with PUT path/id)
   record        the entry being edited (needs _id)
   fields        [{ name, label, type, options, required, step,
                    showIf, readOnly }]
                 type: text | number | date | select | textarea
   initialValues starting value for each field name
   itemsConfig   (optional) { products, qtyKey, qtyLabel, priceLabel }
                 shows the product rows (product, kg, price per kg)
   initialItems  (optional) starting rows for the product list
   transform     (optional) (values, items) => data to send
   onSaved       called after a successful save
------------------------------------------------------------------ */
export function EditModal({
  title,
  path,
  record,
  fields,
  initialValues,
  itemsConfig,
  initialItems,
  transform,
  onSaved,
  onClose,
}) {
  const [values, setValues] = useState(initialValues || {});
  const [items, setItems] = useState(initialItems || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleItemChange = (index, name, value) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { product: "", [itemsConfig.qtyKey]: "", pricePerKg: "" },
    ]);
  };

  const removeItem = (index) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const cleanItems = itemsConfig
        ? items.map((item) => ({
            ...item,
            product: item.product,
            [itemsConfig.qtyKey]: Number(item[itemsConfig.qtyKey]),
            pricePerKg: Number(item.pricePerKg),
          }))
        : undefined;

      const payload = transform
        ? transform(values, cleanItems)
        : cleanItems
        ? { ...values, items: cleanItems }
        : { ...values };

      await api.put(`${path}/${record._id}`, payload);

      if (onSaved) {
        await onSaved();
      }

      onClose();
    } catch (err) {
      setError(errorMessage(err, "Failed to save changes."));
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    if (field.showIf && !field.showIf(values)) {
      return null;
    }

    const value = values[field.name] ?? "";

    let input;

    if (field.type === "select") {
      input = (
        <SearchSelect
          className="form-select"
          value={value}
          required={field.required}
          disabled={field.readOnly}
          onChange={(e) => handleChange(field.name, e.target.value)}
        >
          <option value="">Select...</option>

          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SearchSelect>
      );
    } else if (field.type === "textarea") {
      input = (
        <textarea
          className="form-control"
          rows="2"
          value={value}
          disabled={field.readOnly}
          onChange={(e) => handleChange(field.name, e.target.value)}
        />
      );
    } else {
      input = (
        <input
          className="form-control"
          type={field.type || "text"}
          step={field.type === "number" ? field.step || "any" : undefined}
          value={value}
          required={field.required}
          disabled={field.readOnly}
          onChange={(e) => handleChange(field.name, e.target.value)}
        />
      );
    }

    return (
      <div className="col-md-6 mb-3" key={field.name}>
        <label className="form-label">{field.label}</label>
        {input}
      </div>
    );
  };

  return (
    <>
      <div
        className="modal d-block"
        tabIndex="-1"
        style={{ overflowY: "auto" }}
      >
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>

              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={saving}
              />
            </div>

            <div className="modal-body">
              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <div className="row">{fields.map(renderField)}</div>

              {itemsConfig && (
                <div className="mt-2">
                  <h6>Products</h6>

                  {items.map((item, index) => (
                    <div className="row g-2 mb-2" key={index}>
                      <div className="col-12 col-md-5">
                        <SearchSelect
                          className="form-select"
                          value={item.product || ""}
                          required
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "product",
                              e.target.value
                            )
                          }
                        >
                          <option value="">Select product...</option>

                          {itemsConfig.products.map((product) => (
                            <option
                              key={product._id}
                              value={product._id}
                            >
                              {product.name}
                              {product.brand
                                ? ` - ${product.brand}`
                                : ""}
                            </option>
                          ))}
                        </SearchSelect>
                      </div>

                      <div className="col-5 col-md-3">
                        <input
                          className="form-control"
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder={`${(itemsConfig.qtyLabel || "Quantity").replace(/\s*\(kg\)/, "")} (${unitOf(
                            (itemsConfig.products || []).find(
                              (p) => p._id === item.product
                            )
                          )})`}
                          value={item[itemsConfig.qtyKey] ?? ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              itemsConfig.qtyKey,
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="col-5 col-md-3">
                        <input
                          className="form-control"
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder={`Price / ${unitOf(
                            (itemsConfig.products || []).find(
                              (p) => p._id === item.product
                            )
                          )}`}
                          value={item.pricePerKg ?? ""}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              "pricePerKg",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="col-2 col-md-1">
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100"
                          disabled={items.length === 1}
                          onClick={() => removeItem(index)}
                          title="Remove this product"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                  {!itemsConfig.fixedProducts && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={addItem}
                    >
                      + Add product
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="modal-backdrop show" />
    </>
  );
}

/* ------------------------------------------------------------------
   Search box for lists.
   Use:  items.filter(matchesSearch(search)).map(...)
   It looks at every visible text / number in a row (names, notes,
   products, dates ...).
------------------------------------------------------------------ */
const SKIP_KEYS = ["_id", "__v", "createdAt", "updatedAt"];

const collectText = (value, parts, depth = 0) => {
  if (value === null || value === undefined || depth > 4) {
    return;
  }

  if (typeof value === "string" || typeof value === "number") {
    parts.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectText(entry, parts, depth + 1));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => {
      if (!SKIP_KEYS.includes(key)) {
        collectText(entry, parts, depth + 1);
      }
    });
  }
};

export const matchesSearch = (query) => {
  const text = (query || "").trim().toLowerCase();

  if (!text) {
    return () => true;
  }

  return (record) => {
    const parts = [];
    collectText(record, parts);
    return parts.join(" ").toLowerCase().includes(text);
  };
};

export function SearchBox({ value, onChange }) {
  return (
    <div className="input-group" style={{ maxWidth: "340px" }}>
      <input
        type="search"
        className="form-control"
        placeholder="🔍 Search..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />

      {value && (
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------
   Drop-in replacement for <select>.
   Write a few letters of the name and the list is filtered
   (letters can be anywhere in the name, capital or small).
   Short lists (4 options or fewer) stay as a normal dropdown.
   Usage is the same as <select>: name, value, onChange, required,
   disabled, className and <option> children.
------------------------------------------------------------------ */
const textOf = (node) => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }

  if (typeof node === "object" && node.props) {
    return textOf(node.props.children);
  }

  return String(node);
};

const collectOptions = (children, list = []) => {
  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object" || !child.props) {
      return;
    }

    if (child.type === "option") {
      list.push({
        value: String(child.props.value ?? textOf(child.props.children)),
        label: textOf(child.props.children).replace(/\s+/g, " ").trim(),
        disabled: !!child.props.disabled,
      });
    } else {
      collectOptions(child.props.children, list);
    }
  });

  return list;
};

// every typed word must be found in the label, or letters appear in order
const labelMatches = (label, query) => {
  const text = label.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.every((word) => text.includes(word))) {
    return true;
  }

  const compact = query.toLowerCase().replace(/\s+/g, "");
  let position = 0;

  for (const letter of compact) {
    position = text.indexOf(letter, position);

    if (position === -1) {
      return false;
    }

    position += 1;
  }

  return compact.length >= 3;
};

export function SearchSelect({
  name,
  value,
  onChange,
  required,
  disabled,
  className,
  children,
}) {
  const options = collectOptions(children);
  const blank = options.find((option) => option.value === "");
  const real = options.filter((option) => option.value !== "");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const selected = real.find(
    (option) => option.value === String(value ?? "")
  );

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.setCustomValidity(
        required && !selected ? "Please choose from the list" : ""
      );
    }
  });

  const send = (newValue) => {
    if (onChange) {
      onChange({ target: { name, value: newValue } });
    }
  };

  // Short lists: normal dropdown
  if (real.length <= 4) {
    return (
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={className}
      >
        {children}
      </select>
    );
  }

  const shown = query
    ? real.filter((option) => labelMatches(option.label, query))
    : real;

  const choose = (option) => {
    send(option.value);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="position-relative">
      <input
        ref={inputRef}
        type="text"
        className={className || "form-control"}
        placeholder={blank?.label || "Type to search..."}
        value={open ? query : selected ? selected.label : ""}
        disabled={disabled}
        autoComplete="off"
        onFocus={(e) => {
          setOpen(true);
          setQuery("");
          e.target.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && shown.length > 0) {
            e.preventDefault();
            choose(shown[0]);
          }

          if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {selected && !disabled && !open && !required && (
        <button
          type="button"
          className="btn btn-sm position-absolute top-50 end-0 translate-middle-y me-1 text-muted"
          aria-label="Clear"
          onMouseDown={(e) => {
            e.preventDefault();
            send("");
          }}
        >
          ✕
        </button>
      )}

      {open && (
        <div
          className="list-group position-absolute w-100 shadow"
          style={{ zIndex: 1060, maxHeight: "240px", overflowY: "auto" }}
        >
          {shown.length === 0 ? (
            <div className="list-group-item text-muted">No match found</div>
          ) : (
            shown.map((option) => (
              <button
                type="button"
                key={option.value}
                disabled={option.disabled}
                className={`list-group-item list-group-item-action ${
                  selected?.value === option.value ? "active" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Unit of a product (kg or packet)
export const unitOf = (product) => product?.unit || "kg";

// "120 kg, 40 packet" from item lines (product must be populated)
export const qtyByUnit = (items, qtyKey = "quantity") => {
  const totals = {};

  (items || []).forEach((item) => {
    const unit = unitOf(item.product);
    totals[unit] = (totals[unit] || 0) + Number(item[qtyKey] || 0);
  });

  const text = Object.entries(totals)
    .map(([unit, total]) => `${Math.round(total * 100) / 100} ${unit}`)
    .join(", ");

  return text || "0";
};

// Newest first by a date field
export const newestFirst = (list, dateKey) =>
  [...(list || [])].sort(
    (a, b) => new Date(b?.[dateKey] || 0) - new Date(a?.[dateKey] || 0)
  );

// Today as yyyy-mm-dd in India time (default for date fields)
export const todayIndia = () => indiaDate(new Date());
