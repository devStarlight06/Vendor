// Product.js - COMPLETE FILE WITH MULTI-CATEGORY + VARIANT + IMAGE ORDER + DESCRIPTION + CUSTOM FIELD
// ✅ FIX: subcategory/categorySubcategoryMap fallbacks + preserved legacy data on edit
// ✅ FIX: token-expiry redirect on all axios calls
// ✅ FIX: edit-modal custom field now bound to editData (was newProduct)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container, Table, Button, Modal, Form, Spinner, Alert, Badge,
  Row, Col, Card, Image
} from "react-bootstrap";
import { motion } from "framer-motion";
import {
  FaEdit, FaTrash, FaPlus, FaFileExcel, FaBan,
  FaExclamationTriangle, FaBoxes, FaWarehouse, FaExclamationCircle,
  FaCheckCircle, FaMinusCircle, FaWeight, FaRulerCombined,
  FaImage, FaTimes, FaDownload, FaArrowLeft, FaArrowRight,
  FaTruck, FaInfoCircle, FaClipboardList, FaLeaf, FaSitemap
} from "react-icons/fa";
import Header from "../../component/header/header";
import Sidebar from "../../component/sidebar/sidebar";

const API_BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:5177/api";
const API_URL = `${API_BASE_URL}/products`;
const ADMIN_CATEGORY_API_URL = "https://api-admin.native91.com/api/category";
const AUTH_API_URL = `${API_BASE_URL}/vendor`;
const BASE_URL = "https://api-vendor.native91.com";

// 🔧 Normalize customField coming from server (handles true/"true"/1/"1")
const normalizeCustomField = (cf) => ({
  enabled: cf?.enabled === true || cf?.enabled === "true" || cf?.enabled === 1 || cf?.enabled === "1",
  label: cf?.label || "",
  value: cf?.value || "",
});

// ✅ Extract all unique subcategories from a categorySubcategoryMap
const extractAllSubCategories = (map) => {
  const out = [];
  if (!map || typeof map !== "object") return out;
  Object.values(map).forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.forEach((s) => {
        if (s && !out.includes(s)) out.push(s);
      });
    }
  });
  return out;
};

const Product = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [categorySubCategories, setCategorySubCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [editData, setEditData] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    category: "",
    categories: [],
    categorySubcategoryMap: {},
    description: "",
    stock: 0,
    images: [],
    variants: [],
    size: "",
    weight: 0,
    weightUnit: "",
    sku: "",
    variant: "",
    dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
    shippingTime: "3-5 days",
    customShippingTime: "",
    estimatedDeliveryDays: { min: 3, max: 5 },
    shippingCharge: 0,
    isFreeShipping: true,
    ingredients: "",
    ingredientsList: [],
    nutritionalInfo: {
      servingSize: "", calories: 0, protein: 0, carbohydrates: 0,
      fat: 0, sugar: 0, fiber: 0, sodium: 0
    },
    allergens: [],
    dietaryInfo: {
      isVegetarian: false, isVegan: false, isGlutenFree: false,
      isDairyFree: false, isNutFree: false, isOrganic: false
    },
    customField: { enabled: false, label: "" }
  });

  const [shippingOptions, setShippingOptions] = useState([]);

  const [stockUpdateData, setStockUpdateData] = useState({
    productId: "", productName: "", currentStock: 0,
    newStock: 0, operation: "set", quantity: 0,
  });

  const [excelFile, setExcelFile] = useState(null);
  const [bulkImages, setBulkImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const [uploadStep, setUploadStep] = useState(1);
  const [validationData, setValidationData] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const [subCategoryLoading, setSubCategoryLoading] = useState(false);

  const [stockSummary, setStockSummary] = useState({
    totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0,
  });

  const token = localStorage.getItem("token");

  const [suspensionInfo, setSuspensionInfo] = useState({
    isSuspended: false, reason: '', suspendedAt: null
  });

  // ================= AUTH HELPERS =================
  const forceLogin = (reason = "session_expired") => {
    localStorage.removeItem("token");
    localStorage.removeItem("vendorData");
    sessionStorage.clear();
    navigate(`/?reason=${reason}`, { replace: true });
  };

  const isAuthError = (err) => {
    const status = err?.response?.status;
    const code = err?.response?.data?.code;
    return (
      status === 401 ||
      code === "TOKEN_EXPIRED" ||
      code === "INVALID_TOKEN" ||
      code === "NO_TOKEN"
    );
  };

  // ================= IMAGE ORDER HELPERS =================
  const moveAddImage = (from, to) => {
    if (to < 0 || to >= newProduct.images.length) return;
    const arr = [...newProduct.images];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setNewProduct({ ...newProduct, images: arr });
  };

  const removeAddImage = (idx) => {
    const arr = newProduct.images.filter((_, i) => i !== idx);
    setNewProduct({ ...newProduct, images: arr });
  };

  const moveExistingImage = (from, to) => {
    if (!editData?.image) return;
    if (to < 0 || to >= editData.image.length) return;
    const arr = [...editData.image];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setEditData({ ...editData, image: arr });
  };

  const removeExistingImage = (idx) => {
    if (!editData?.image) return;
    const arr = editData.image.filter((_, i) => i !== idx);
    setEditData({ ...editData, image: arr });
  };

  const moveNewImage = (from, to) => {
    if (!editData?.newImages) return;
    if (to < 0 || to >= editData.newImages.length) return;
    const arr = [...editData.newImages];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setEditData({ ...editData, newImages: arr });
  };

  const removeNewImage = (idx) => {
    if (!editData?.newImages) return;
    const arr = editData.newImages.filter((_, i) => i !== idx);
    setEditData({ ...editData, newImages: arr });
  };

  const buildImageUrl = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    if (imgPath.startsWith('/uploads/')) return `${BASE_URL}${imgPath}`;
    if (!imgPath.startsWith('/')) return `${BASE_URL}/uploads/${imgPath}`;
    return `${BASE_URL}${imgPath}`;
  };

  // ================= FETCH SHIPPING OPTIONS =================
  const fetchShippingOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/shipping-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setShippingOptions(res.data.shippingOptions);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error fetching shipping options:", err);
      setShippingOptions([
        { value: '1-2 days', label: '1-2 days' },
        { value: '2-3 days', label: '2-3 days' },
        { value: '3-4 days', label: '3-4 days' },
        { value: '3-5 days', label: '3-5 days' },
        { value: '5-7 days', label: '5-7 days' },
        { value: '7-10 days', label: '7-10 days' },
        { value: '10-15 days', label: '10-15 days' },
        { value: '15-30 days', label: '15-30 days' },
        { value: 'Custom', label: 'Custom (specify custom shipping time)' }
      ]);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/all-sub-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setSubCategories(res.data.subCategories || []);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error fetching sub-categories:", err);
      setSubCategories([]);
    }
  };

  const fetchCategoriesWithSub = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories-with-sub`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const catSubMap = {};
        res.data.data.forEach(item => {
          catSubMap[item.category] = item.subCategories || [];
        });
        setCategorySubCategories(catSubMap);
      }
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error fetching categories with sub-categories:", err);
      await buildCategorySubMapFromProducts();
    }
  };

  const fetchSubCategoriesForCategory = async (category) => {
    if (!category) return [];
    try {
      const res = await axios.get(
        `${API_URL}/categories/${encodeURIComponent(category)}/subcategories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) return res.data.subCategories || [];
      return [];
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return []; }
      console.error(`Error fetching sub-categories for ${category}:`, err);
      return [];
    }
  };

  const buildCategorySubMapFromProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const productList = res.data.products || res.data || [];
      const catSubMap = {};
      productList.forEach(product => {
        const category = product.category;
        if (!category) return;
        if (!catSubMap[category]) catSubMap[category] = new Set();
        const single = product.subcategory || product.subCategory;
        if (single) catSubMap[category].add(single);
        const arr = product.subcategories || product.subCategories || [];
        if (Array.isArray(arr)) arr.forEach(sub => { if (sub) catSubMap[category].add(sub); });
      });
      const finalMap = {};
      Object.keys(catSubMap).forEach(key => { finalMap[key] = Array.from(catSubMap[key]); });
      setCategorySubCategories(finalMap);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error building category-sub map:", err);
      setCategorySubCategories({});
    }
  };

  const checkVendorStatus = async () => {
    try {
      const res = await axios.get(`${AUTH_API_URL}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;
      if (data && data.isSuspended) {
        setSuspensionInfo({
          isSuspended: true,
          reason: data.suspensionReason || 'No reason provided',
          suspendedAt: data.suspendedAt
        });
        return { suspended: true, redirected: false };
      }
      return { suspended: false, redirected: false };
    } catch (err) {
      if (isAuthError(err)) {
        forceLogin();
        return { suspended: false, redirected: true };
      }
      console.warn("Status check error:", err.message);
      try {
        const storedVendor = JSON.parse(localStorage.getItem('vendorData') || '{}');
        if (storedVendor.status === 'suspended') {
          setSuspensionInfo({
            isSuspended: true,
            reason: storedVendor.suspensionReason || 'No reason provided',
            suspendedAt: storedVendor.suspendedAt
          });
          return { suspended: true, redirected: false };
        }
      } catch { /* ignore */ }
      return { suspended: false, redirected: false };
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      setError("");
      const res = await axios.get(`${ADMIN_CATEGORY_API_URL}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let categoriesData = [];
      if (res.data.success && Array.isArray(res.data.categories)) categoriesData = res.data.categories;
      else if (Array.isArray(res.data)) categoriesData = res.data;
      else if (res.data.categories && Array.isArray(res.data.categories)) categoriesData = res.data.categories;
      const activeCategories = categoriesData.filter(cat => cat.status === "active");
      setCategories(activeCategories);
      if (activeCategories.length === 0) setError("No active categories found. Please contact admin.");
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/my-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productList = res.data.products || res.data || [];
      setProducts(productList);
      calculateStockSummary(productList);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Error fetching products:", err);
      if (err.response?.status === 403) setError("Access denied. Please check your account status.");
      else setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const calculateStockSummary = (productList) => {
    const summary = { totalProducts: productList.length, totalStock: 0, lowStock: 0, outOfStock: 0 };
    productList.forEach(product => {
      const stock = product.stock || 0;
      summary.totalStock += stock;
      if (stock === 0) summary.outOfStock++;
      else if (stock <= 10) summary.lowStock++;
    });
    setStockSummary(summary);
  };

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // No token → straight to login
      if (!token) {
        forceLogin("auth_required");
        return;
      }

      const status = await checkVendorStatus();
      if (cancelled || status.redirected) return;

      if (!status.suspended) {
        await Promise.all([
          fetchProducts(), fetchCategories(), fetchShippingOptions(),
          fetchSubCategories(), fetchCategoriesWithSub()
        ]);
      } else {
        setLoading(false);
        setCategoriesLoading(false);
      }
    };
    initialize();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ================= MULTI-CATEGORY HANDLERS =================
  const toggleCategory = async (categoryName, isEdit = false) => {
    const updater = (prev) => {
      const current = prev.categories || [];
      const isSelected = current.includes(categoryName);
      const newCategories = isSelected
        ? current.filter((c) => c !== categoryName)
        : [...current, categoryName];

      const newMap = { ...(prev.categorySubcategoryMap || {}) };
      if (isSelected) {
        delete newMap[categoryName];
      } else {
        newMap[categoryName] = newMap[categoryName] || [];
      }

      return {
        ...prev,
        categories: newCategories,
        categorySubcategoryMap: newMap,
        category: newCategories[0] || "",
        // 🔒 preserve customField explicitly
        customField: prev.customField ?? { enabled: false, label: "", value: "" },
      };
    };

    if (isEdit) setEditData(updater);
    else setNewProduct(updater);

    if (!categorySubCategories[categoryName]) {
      try {
        const subs = await fetchSubCategoriesForCategory(categoryName);
        setCategorySubCategories((prev) => ({ ...prev, [categoryName]: subs }));
      } catch (err) {
        console.error(`Error loading subcategories for ${categoryName}:`, err);
      }
    }
  };

  const toggleSubcategory = (categoryName, subName, isEdit = false) => {
    const updater = (prev) => {
      const currentMap = { ...(prev.categorySubcategoryMap || {}) };
      const currentSubs = currentMap[categoryName] || [];
      const isSelected = currentSubs.includes(subName);

      currentMap[categoryName] = isSelected
        ? currentSubs.filter((s) => s !== subName)
        : [...currentSubs, subName];

      return {
        ...prev,
        categorySubcategoryMap: currentMap,
        // 🔒 preserve customField explicitly
        customField: prev.customField ?? { enabled: false, label: "", value: "" },
      };
    };

    if (isEdit) setEditData(updater);
    else setNewProduct(updater);
  };

  // ================= VARIANT HANDLERS =================
  const addVariantRow = (isEdit = false) => {
    const newVariant = {
      color: "", size: "",
      image: null, imagePreview: "", existingImage: "",
      stock: 0, isAvailable: true, price: 0
    };
    const updater = (prev) => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant],
      customField: prev.customField ?? { enabled: false, label: "", value: "" },
    });
    if (isEdit) setEditData(updater);
    else setNewProduct(updater);
  };

  const updateVariantField = (index, field, value, isEdit = false) => {
    const updater = (prev) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], [field]: value };
      return {
        ...prev,
        variants: updated,
        customField: prev.customField ?? { enabled: false, label: "", value: "" },
      };
    };
    if (isEdit) setEditData(updater);
    else setNewProduct(updater);
  };

  const handleVariantImageChange = (index, file, isEdit = false) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    const updater = (prev) => {
      const updated = [...(prev.variants || [])];
      updated[index] = { ...updated[index], image: file, imagePreview: preview };
      return {
        ...prev,
        variants: updated,
        customField: prev.customField ?? { enabled: false, label: "", value: "" },
      };
    };
    if (isEdit) setEditData(updater);
    else setNewProduct(updater);
  };

  const removeVariantRow = (index, isEdit = false) => {
    const updater = (prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((_, i) => i !== index),
      customField: prev.customField ?? { enabled: false, label: "", value: "" },
    });
    if (isEdit) setEditData(updater);
    else setNewProduct(updater);
  };

  const buildVariantsPayload = (variants, formData) => {
    const payload = [];
    (variants || []).forEach((v, idx) => {
      const variantData = {
        _id: v._id,
        color: v.color || "",
        size: v.size || "",
        stock: parseInt(v.stock) || 0,
        isAvailable: v.isAvailable !== false,
        price: parseFloat(v.price) || 0,
        image: v.existingImage || ""
      };
      if (v.image && v.image instanceof File) {
        formData.append("variantImages", v.image);
        variantData.imageIndex = idx;
        variantData.hasNewImage = true;
      }
      payload.push(variantData);
    });
    return JSON.stringify(payload);
  };

  // ================= ADD PRODUCT =================
  const handleAddProduct = async () => {
    if (suspensionInfo.isSuspended) { setError("Cannot add products while account is suspended."); return; }
    if (!newProduct.name || !newProduct.price || (!newProduct.category && (!newProduct.categories || newProduct.categories.length === 0))) {
      setError("Please fill all required fields (Name, Price, Category)");
      return;
    }
    if (!newProduct.description || !newProduct.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!newProduct.images || newProduct.images.length === 0) {
      setError("At least one product image is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price);

      const primaryCategory = newProduct.category || (newProduct.categories?.[0] || "");
      formData.append("category", primaryCategory);

      formData.append("categories", JSON.stringify(newProduct.categories || []));
      formData.append("categorySubcategoryMap", JSON.stringify(newProduct.categorySubcategoryMap || {}));

      const allSubCategories = extractAllSubCategories(newProduct.categorySubcategoryMap);
      formData.append("subcategory", allSubCategories[0] || "");
      formData.append("subcategories", JSON.stringify(allSubCategories));

      formData.append("description", newProduct.description.trim());
      formData.append("stock", newProduct.stock || 0);
      formData.append("size", newProduct.size || "");
      formData.append("weight", newProduct.weight || 0);
      formData.append("weightUnit", newProduct.weightUnit || "");
      formData.append("sku", newProduct.sku || "");
      formData.append("variant", newProduct.variant || "");
      formData.append("dimensions[length]", newProduct.dimensions?.length || 0);
      formData.append("dimensions[width]", newProduct.dimensions?.width || 0);
      formData.append("dimensions[height]", newProduct.dimensions?.height || 0);
      formData.append("dimensions[unit]", newProduct.dimensions?.unit || "cm");
      formData.append("shippingTime", newProduct.shippingTime || "3-5 days");
      formData.append("customShippingTime", newProduct.customShippingTime || "");
      formData.append("estimatedDeliveryDays[min]", newProduct.estimatedDeliveryDays?.min || 3);
      formData.append("estimatedDeliveryDays[max]", newProduct.estimatedDeliveryDays?.max || 5);
      formData.append("shippingCharge", newProduct.shippingCharge || 0);
      formData.append("isFreeShipping", newProduct.isFreeShipping ? "true" : "false");
      formData.append("ingredients", newProduct.ingredients || "");
      formData.append("ingredientsList", newProduct.ingredientsList?.join(', ') || "");
      formData.append("allergens", newProduct.allergens?.join(', ') || "");
      formData.append("nutritionalInfo[servingSize]", newProduct.nutritionalInfo?.servingSize || "");
      formData.append("nutritionalInfo[calories]", newProduct.nutritionalInfo?.calories || 0);
      formData.append("nutritionalInfo[protein]", newProduct.nutritionalInfo?.protein || 0);
      formData.append("nutritionalInfo[carbohydrates]", newProduct.nutritionalInfo?.carbohydrates || 0);
      formData.append("nutritionalInfo[fat]", newProduct.nutritionalInfo?.fat || 0);
      formData.append("nutritionalInfo[sugar]", newProduct.nutritionalInfo?.sugar || 0);
      formData.append("nutritionalInfo[fiber]", newProduct.nutritionalInfo?.fiber || 0);
      formData.append("nutritionalInfo[sodium]", newProduct.nutritionalInfo?.sodium || 0);
      formData.append("dietaryInfo[isVegetarian]", newProduct.dietaryInfo?.isVegetarian ? "true" : "false");
      formData.append("dietaryInfo[isVegan]", newProduct.dietaryInfo?.isVegan ? "true" : "false");
      formData.append("dietaryInfo[isGlutenFree]", newProduct.dietaryInfo?.isGlutenFree ? "true" : "false");
      formData.append("dietaryInfo[isDairyFree]", newProduct.dietaryInfo?.isDairyFree ? "true" : "false");
      formData.append("dietaryInfo[isNutFree]", newProduct.dietaryInfo?.isNutFree ? "true" : "false");
      formData.append("dietaryInfo[isOrganic]", newProduct.dietaryInfo?.isOrganic ? "true" : "false");

      formData.append("customField[enabled]", newProduct.customField?.enabled ? "true" : "false");
      formData.append("customField[label]",   newProduct.customField?.label || "");
      if (newProduct.images && newProduct.images.length > 0) {
        newProduct.images.forEach((file, index) => {
          const renamed = new File(
            [file],
            `${String(index).padStart(3, '0')}_${file.name}`,
            { type: file.type }
          );
          formData.append("images", renamed);
        });
      }

      const variantsJSON = buildVariantsPayload(newProduct.variants, formData);
      formData.append("variants", variantsJSON);

      await axios.post(API_URL, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowAdd(false);
      setNewProduct({
        name: "", price: "", category: "", categories: [], categorySubcategoryMap: {},
        description: "", stock: 0, images: [],
        variants: [], size: "", weight: 0, weightUnit: "", sku: "", variant: "",
        dimensions: { length: 0, width: 0, height: 0, unit: "cm" },
        shippingTime: "3-5 days", customShippingTime: "",
        estimatedDeliveryDays: { min: 3, max: 5 },
        shippingCharge: 0, isFreeShipping: true,
        ingredients: "", ingredientsList: [],
        nutritionalInfo: { servingSize: "", calories: 0, protein: 0, carbohydrates: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0 },
        allergens: [],
        dietaryInfo: { isVegetarian: false, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: false, isOrganic: false },
        customField: { enabled: false, label: ""}
      });
      fetchProducts();
      setSuccess("Product added successfully!");
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Add product error:", err);
      setError(err.response?.data?.message || "Add product failed");
    }
  };

  // ================= EDIT PRODUCT =================
  const handleEdit = (product) => {
    if (suspensionInfo.isSuspended) { setError("Cannot edit products while account is suspended."); return; }

    const mappedVariants = (product.variants || []).map(v => ({
      _id: v._id, color: v.color || "", size: v.size || "",
      image: null, imagePreview: "", existingImage: v.image || "",
      stock: v.stock || 0, isAvailable: v.isAvailable !== false, price: v.price || 0
    }));

    const productCategories = (product.categories && product.categories.length > 0)
      ? product.categories
      : (product.category ? [product.category] : []);

    let productMap = product.categorySubcategoryMap || {};
    const mapIsEmpty = !productMap || Object.keys(productMap).length === 0;

    const legacySubs = Array.isArray(product.subcategories) && product.subcategories.length > 0
      ? product.subcategories
      : (product.subcategory ? [product.subcategory] : []);

    if (mapIsEmpty && productCategories.length > 0 && legacySubs.length > 0) {
      productMap = { [productCategories[0]]: legacySubs };
    }

    setEditData({
      ...product,
      variants: mappedVariants,
      categories: productCategories,
      categorySubcategoryMap: productMap,
      subcategory: product.subcategory || legacySubs[0] || "",
      subcategories: Array.isArray(product.subcategories) && product.subcategories.length > 0
        ? product.subcategories
        : legacySubs,
      dimensions: product.dimensions || { length: 0, width: 0, height: 0, unit: "cm" },
      estimatedDeliveryDays: product.estimatedDeliveryDays || { min: 3, max: 5 },
      shippingTime: product.shippingTime || "3-5 days",
      customShippingTime: product.customShippingTime || "",
      shippingCharge: product.shippingCharge || 0,
      isFreeShipping: product.isFreeShipping !== undefined ? product.isFreeShipping : true,
      ingredients: product.ingredients || "",
      ingredientsList: product.ingredientsList || [],
      nutritionalInfo: product.nutritionalInfo || {
        servingSize: "", calories: 0, protein: 0, carbohydrates: 0, fat: 0, sugar: 0, fiber: 0, sodium: 0
      },
      allergens: product.allergens || [],
      dietaryInfo: product.dietaryInfo || {
        isVegetarian: false, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: false, isOrganic: false
      },
      newImages: [],
      // 🔑 NORMALIZE customField (handles legacy products / string booleans)
      customField: normalizeCustomField(product.customField),
    });

    if (product.category) {
      setSubCategoryLoading(true);
      fetchSubCategoriesForCategory(product.category)
        .then(subs => setCategorySubCategories(prev => ({ ...prev, [product.category]: subs })))
        .finally(() => setSubCategoryLoading(false));
    }
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (suspensionInfo.isSuspended) { setError("Cannot update products while account is suspended."); return; }

    if (!editData.description || !editData.description.trim()) {
      setError("Description is required");
      return;
    }

    const hasExistingImages = Array.isArray(editData.image) && editData.image.length > 0;
    const hasNewImages = Array.isArray(editData.newImages) && editData.newImages.length > 0;
    if (!hasExistingImages && !hasNewImages) {
      setError("At least one product image is required");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", editData.name);
      formData.append("price", editData.price);

      const primaryCategory = editData.category || (editData.categories?.[0] || "");
      formData.append("category", primaryCategory);

      formData.append("categories", JSON.stringify(editData.categories || []));
      formData.append("categorySubcategoryMap", JSON.stringify(editData.categorySubcategoryMap || {}));

      let allSubCategories = extractAllSubCategories(editData.categorySubcategoryMap);

      if (allSubCategories.length === 0) {
        if (Array.isArray(editData.subcategories) && editData.subcategories.length > 0) {
          allSubCategories = [...editData.subcategories];
        } else if (editData.subcategory) {
          allSubCategories = [editData.subcategory];
        }
      }

      if (editData.subcategory && !allSubCategories.includes(editData.subcategory)) {
        allSubCategories.unshift(editData.subcategory);
      }

      const finalSubcategory = allSubCategories[0] || editData.subcategory || "";
      const finalSubcategories = allSubCategories.length > 0
        ? allSubCategories
        : (Array.isArray(editData.subcategories) ? editData.subcategories : []);

      formData.append("subcategory", finalSubcategory);
      formData.append("subcategories", JSON.stringify(finalSubcategories));

      formData.append("description", editData.description.trim());
      formData.append("stock", editData.stock || 0);
      formData.append("size", editData.size || "");
      formData.append("weight", editData.weight || 0);
      formData.append("weightUnit", editData.weightUnit || "");
      formData.append("sku", editData.sku || "");
      formData.append("variant", editData.variant || "");
      formData.append("dimensions[length]", editData.dimensions?.length || 0);
      formData.append("dimensions[width]", editData.dimensions?.width || 0);
      formData.append("dimensions[height]", editData.dimensions?.height || 0);
      formData.append("dimensions[unit]", editData.dimensions?.unit || "cm");
      formData.append("shippingTime", editData.shippingTime || "3-5 days");
      formData.append("customShippingTime", editData.customShippingTime || "");
      formData.append("estimatedDeliveryDays[min]", editData.estimatedDeliveryDays?.min || 3);
      formData.append("estimatedDeliveryDays[max]", editData.estimatedDeliveryDays?.max || 5);
      formData.append("shippingCharge", editData.shippingCharge || 0);
      formData.append("isFreeShipping", editData.isFreeShipping ? "true" : "false");
      formData.append("ingredients", editData.ingredients || "");
      formData.append("ingredientsList", editData.ingredientsList?.join(', ') || "");
      formData.append("allergens", editData.allergens?.join(', ') || "");
      formData.append("nutritionalInfo[servingSize]", editData.nutritionalInfo?.servingSize || "");
      formData.append("nutritionalInfo[calories]", editData.nutritionalInfo?.calories || 0);
      formData.append("nutritionalInfo[protein]", editData.nutritionalInfo?.protein || 0);
      formData.append("nutritionalInfo[carbohydrates]", editData.nutritionalInfo?.carbohydrates || 0);
      formData.append("nutritionalInfo[fat]", editData.nutritionalInfo?.fat || 0);
      formData.append("nutritionalInfo[sugar]", editData.nutritionalInfo?.sugar || 0);
      formData.append("nutritionalInfo[fiber]", editData.nutritionalInfo?.fiber || 0);
      formData.append("nutritionalInfo[sodium]", editData.nutritionalInfo?.sodium || 0);
      formData.append("dietaryInfo[isVegetarian]", editData.dietaryInfo?.isVegetarian ? "true" : "false");
      formData.append("dietaryInfo[isVegan]", editData.dietaryInfo?.isVegan ? "true" : "false");
      formData.append("dietaryInfo[isGlutenFree]", editData.dietaryInfo?.isGlutenFree ? "true" : "false");
      formData.append("dietaryInfo[isDairyFree]", editData.dietaryInfo?.isDairyFree ? "true" : "false");
      formData.append("dietaryInfo[isNutFree]", editData.dietaryInfo?.isNutFree ? "true" : "false");
      formData.append("dietaryInfo[isOrganic]", editData.dietaryInfo?.isOrganic ? "true" : "false");

      formData.append("customField[enabled]", editData.customField?.enabled ? "true" : "false");
      formData.append("customField[label]", editData.customField?.label || "");
      formData.append("customField[value]", editData.customField?.value || "");

      if (editData.image && editData.image.length > 0) {
        formData.append("existingImages", JSON.stringify(editData.image));
      }

      if (editData.newImages && editData.newImages.length > 0) {
        editData.newImages.forEach((file, index) => {
          const renamed = new File(
            [file],
            `${String(index).padStart(3, '0')}_${file.name}`,
            { type: file.type }
          );
          formData.append("images", renamed);
        });
      }

      const variantsJSON = buildVariantsPayload(editData.variants, formData);
      formData.append("variants", variantsJSON);

      await axios.put(`${API_URL}/${editData._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setShowEdit(false);
      fetchProducts();
      setSuccess("Product updated successfully!");
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Update error:", err);
      setError(err.response?.data?.message || "Update failed");
    }
  };

  // ================= STOCK MANAGEMENT =================
  const openStockModal = (product) => {
    setStockUpdateData({
      productId: product._id, productName: product.name,
      currentStock: product.stock || 0, newStock: product.stock || 0,
      operation: "set", quantity: 0,
    });
    setShowStockModal(true);
  };

  const handleStockUpdate = async () => {
    if (suspensionInfo.isSuspended) { setError("Cannot update stock while account is suspended."); return; }
    try {
      let finalStock = stockUpdateData.newStock;
      if (stockUpdateData.operation === "add") {
        finalStock = stockUpdateData.currentStock + stockUpdateData.quantity;
      } else if (stockUpdateData.operation === "subtract") {
        if (stockUpdateData.currentStock < stockUpdateData.quantity) {
          setError("Insufficient stock! Cannot subtract more than available.");
          return;
        }
        finalStock = stockUpdateData.currentStock - stockUpdateData.quantity;
      }
      if (finalStock < 0) { setError("Stock cannot be negative!"); return; }

      await axios.patch(
        `${API_URL}/product/${stockUpdateData.productId}/stock`,
        { stock: finalStock },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowStockModal(false);
      fetchProducts();
      setSuccess(`Stock updated successfully! New stock: ${finalStock}`);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("❌ Stock update error:", err);
      setError(err.response?.data?.message || "Failed to update stock");
    }
  };

  const handleDelete = async (id) => {
    if (suspensionInfo.isSuspended) { setError("Cannot delete products while account is suspended."); return; }
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setProducts(products.filter((p) => p._id !== id));
      setSuccess("Product deleted successfully!");
      calculateStockSummary(products.filter((p) => p._id !== id));
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Delete error:", err);
      setError("Delete failed");
    }
  };

  const downloadTemplate = async () => {
    if (suspensionInfo.isSuspended) { setError("Cannot download template while account is suspended."); return; }
    try {
      const response = await axios.get(`${API_URL}/download-template`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "product_bulk_upload_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess("Template downloaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Download template error:", err);
      setError("Failed to download template");
    }
  };

  // ================= BULK UPLOAD =================
  const handleValidateExcel = async () => {
    if (!excelFile) { setError("Please select an Excel file"); return; }
    const formData = new FormData();
    formData.append("excelFile", excelFile);
    setUploadProgress(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}/bulk-upload/validate`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setValidationData(response.data.data);
        setUploadStep(2);
        setSuccess(`✅ File validated! ${response.data.data.summary.valid} valid rows found.`);
      }
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Validation error:", err);
      setError(err.response?.data?.message || "Validation failed");
    } finally {
      setUploadProgress(false);
    }
  };

  const handleProcessBulkUpload = async () => {
    if (!excelFile) { setError("Please select an Excel file"); return; }
    const formData = new FormData();
    formData.append("excelFile", excelFile);
    if (bulkImages && bulkImages.length > 0) {
      bulkImages.forEach((file) => formData.append("images", file));
    }
    setUploadProgress(true);
    setUploadResult(null);
    setProcessingProgress(0);
    try {
      const response = await axios.post(`${API_URL}/bulk-upload/process`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          setProcessingProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });
      setUploadResult(response.data);
      if (response.data.summary.successful > 0) {
        setSuccess(`✅ ${response.data.message}`);
        fetchProducts();
        setTimeout(() => {
          setShowBulkUpload(false);
          resetBulkUpload();
        }, 2000);
      } else {
        setError("No products were uploaded. Please check the file format.");
      }
    } catch (err) {
      if (isAuthError(err)) { forceLogin(); return; }
      console.error("Bulk upload error:", err);
      setError(err.response?.data?.message || "Bulk upload failed");
    } finally {
      setUploadProgress(false);
      setProcessingProgress(100);
    }
  };

  const resetBulkUpload = () => {
    setUploadStep(1);
    setValidationData(null);
    setExcelFile(null);
    setBulkImages([]);
    setUploadResult(null);
    setProcessingProgress(0);
  };

  const getImageUrl = (product) => {
    if (!product) return null;
    let imagePath = null;
    if (product.image) {
      if (Array.isArray(product.image) && product.image.length > 0) imagePath = product.image[0];
      else if (typeof product.image === 'string' && product.image) imagePath = product.image;
    }
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `${BASE_URL}${imagePath}`;
    if (!imagePath.startsWith('/') && !imagePath.startsWith('http')) return `${BASE_URL}/uploads/${imagePath}`;
    return `${BASE_URL}${imagePath}`;
  };

  const getShippingDisplay = (product) => {
    if (!product) return "—";
    let shippingText = product.shippingTime || "3-5 days";
    if (shippingText === "Custom" && product.customShippingTime) shippingText = product.customShippingTime;
    const charge = product.shippingCharge || 0;
    const isFree = product.isFreeShipping !== undefined ? product.isFreeShipping : true;
    const chargeText = isFree ? "Free" : `₹${charge}`;
    return `${chargeText} • ${shippingText}`;
  };

  // ================= RENDER =================
  if (loading || categoriesLoading) {
    return (
      <>
        <Header />
        <Sidebar />
        <main className="admin-content mt-5">
          <Container fluid>
            <div className="text-center py-5">
              <Spinner animation="border" /> Loading products...
            </div>
          </Container>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <Sidebar />

      <main className="admin-content mt-5">
        <Container fluid>
          {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess("")} dismissible>{success}</Alert>}

          {suspensionInfo.isSuspended && (
            <Alert variant="danger" className="mb-4">
              <div className="d-flex align-items-start">
                <FaBan className="me-3 mt-1" style={{ fontSize: '28px' }} />
                <div>
                  <h5 className="mb-1">
                    <FaExclamationTriangle className="me-2" />
                    Account Suspended
                  </h5>
                  <p className="mb-1">
                    <strong>Reason:</strong> {suspensionInfo.reason || 'No reason provided'}
                  </p>
                  {suspensionInfo.suspendedAt && (
                    <small className="text-muted d-block">
                      Suspended on: {new Date(suspensionInfo.suspendedAt).toLocaleString()}
                    </small>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {!suspensionInfo.isSuspended && (
            <Row className="mb-4">
              <Col md={3}>
                <Card className="text-center bg-primary text-white">
                  <Card.Body>
                    <FaBoxes size={30} />
                    <h5 className="mt-2">{stockSummary.totalProducts}</h5>
                    <small>Total Products</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-success text-white">
                  <Card.Body>
                    <FaWarehouse size={30} />
                    <h5 className="mt-2">{stockSummary.totalStock}</h5>
                    <small>Total Stock</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-warning text-dark">
                  <Card.Body>
                    <FaExclamationCircle size={30} />
                    <h5 className="mt-2">{stockSummary.lowStock}</h5>
                    <small>Low Stock (≤ 10)</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center bg-danger text-white">
                  <Card.Body>
                    <FaMinusCircle size={30} />
                    <h5 className="mt-2">{stockSummary.outOfStock}</h5>
                    <small>Out of Stock</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <div className="d-flex justify-content-between align-items-center mb-4">
            <motion.h4 initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              My Products
              {suspensionInfo.isSuspended && (
                <Badge bg="danger" className="ms-2">
                  <FaBan className="me-1" /> Suspended
                </Badge>
              )}
              <Badge bg="secondary" className="ms-2">
                {products.length} products
              </Badge>
            </motion.h4>
            <div>
              {!suspensionInfo.isSuspended ? (
                <>
                  <Button variant="success" className="me-2" onClick={() => setShowBulkUpload(true)}>
                    <FaFileExcel /> Bulk Upload
                  </Button>
                  <Button onClick={() => setShowAdd(true)}>
                    <FaPlus /> Add Product
                  </Button>
                </>
              ) : (
                <Button variant="secondary" disabled>
                  <FaBan className="me-1" /> Product Management Disabled
                </Button>
              )}
            </div>
          </div>

          <Table responsive bordered hover className={suspensionInfo.isSuspended ? 'opacity-50' : ''}>
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Sub-Category</th>
                <th>Variants</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Shipping</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center">
                    {suspensionInfo.isSuspended ? 'Products are hidden while account is suspended' : 'No products found'}
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const stock = item.stock || 0;
                  let stockBadgeColor = "success";
                  let stockLabel = `${stock} in stock`;
                  if (stock === 0) { stockBadgeColor = "danger"; stockLabel = "Out of Stock"; }
                  else if (stock <= 10) { stockBadgeColor = "warning"; stockLabel = `Low Stock (${stock})`; }

                  const imageUrl = getImageUrl(item);
                  const dbSub = item.subcategory || item.subCategory;
                  const dbSubs = item.subcategories || item.subCategories || [];
                  const variants = item.variants || [];

                  const productCategories = item.categories && item.categories.length > 0
                    ? item.categories
                    : (item.category ? [item.category] : []);

                  let subCategoryDisplay = "—";
                  if (dbSub) subCategoryDisplay = dbSub;
                  else if (dbSubs.length > 0) subCategoryDisplay = dbSubs.join(', ');

                  return (
                    <tr key={item._id} className={suspensionInfo.isSuspended ? 'table-secondary' : ''}>
                      <td>
                        {imageUrl ? (
                          <Image src={imageUrl} alt={item.name}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="d-flex align-items-center justify-content-center"
                            style={{ width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '4px', color: '#999' }}>
                            <FaImage size={20} />
                          </div>
                        )}
                      </td>
                      <td>{item.name}</td>
                      <td>
                        {productCategories.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {productCategories.slice(0, 2).map((cat, idx) => (
                              <Badge key={idx} bg="primary" style={{ fontSize: '10px' }}>
                                {cat}
                              </Badge>
                            ))}
                            {productCategories.length > 2 && (
                              <Badge bg="secondary" style={{ fontSize: '10px' }}>
                                +{productCategories.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {subCategoryDisplay !== "—" ? (
                          <Badge bg="info"><FaSitemap className="me-1" size={10} />{subCategoryDisplay}</Badge>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {variants.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {variants.slice(0, 2).map((v, idx) => (
                              <Badge key={idx} bg="primary" style={{ fontSize: '10px' }}>
                                {v.color && `🎨 ${v.color}`}
                                {v.size && ` 📏 ${v.size}`}
                                {v.stock !== undefined && ` • ${v.stock}`}
                              </Badge>
                            ))}
                            {variants.length > 2 && (
                              <Badge bg="secondary" style={{ fontSize: '10px' }}>
                                +{variants.length - 2} more
                              </Badge>
                            )}
                          </div>
                        ) : <span className="text-muted small">—</span>}
                      </td>
                      <td>₹{item.price}</td>
                      <td><Badge bg={stockBadgeColor}>{stockLabel}</Badge></td>
                      <td><small><FaTruck className="me-1 text-muted" />{getShippingDisplay(item)}</small></td>
                      <td><Badge bg={item.isActive !== false ? 'success' : 'secondary'}>
                        {item.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge></td>
                      <td>
                        {!suspensionInfo.isSuspended ? (
                          <>
                            <Button size="sm" variant="outline-info" className="me-1" onClick={() => openStockModal(item)}>
                              <FaBoxes />
                            </Button>
                            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleEdit(item)}>
                              <FaEdit />
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item._id)}>
                              <FaTrash />
                            </Button>
                          </>
                        ) : <Badge bg="secondary">Locked</Badge>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Container>
      </main>

      {/* ================= ADD MODAL ================= */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Add Product</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Product Name *</Form.Label>
                  <Form.Control placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Price (₹) *</Form.Label>
                  <Form.Control type="number" placeholder="Enter price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                <FaSitemap className="me-2" />
                Select Categories (Multiple) *
                <Badge bg="secondary" className="ms-2">
                  {newProduct.categories?.length || 0} selected
                </Badge>
              </Form.Label>
              <div style={{
                maxHeight: "200px", overflowY: "auto", padding: "10px",
                border: "1px solid #dee2e6", borderRadius: "8px", background: "#f8f9fa",
              }}>
                {categories.length === 0 ? (
                  <div className="text-muted text-center py-2">No categories available</div>
                ) : (
                  categories.map((category) => {
                    const isSelected = (newProduct.categories || []).includes(category.name);
                    return (
                      <Form.Check key={category._id} type="checkbox"
                        id={`add-cat-${category._id}`}
                        label={category.name}
                        checked={isSelected}
                        onChange={() => toggleCategory(category.name, false)}
                        className="mb-2" />
                    );
                  })
                )}
              </div>
            </Form.Group>

            {(newProduct.categories || []).length > 0 && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  <FaSitemap className="me-2" /> Sub-Categories per Category
                </Form.Label>
                {(newProduct.categories || []).map((catName) => {
                  const subs = categorySubCategories[catName] || [];
                  const selectedSubs = newProduct.categorySubcategoryMap?.[catName] || [];
                  return (
                    <Card key={catName} className="mb-2 p-2">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{catName}</strong>
                        <Badge bg="info">{selectedSubs.length} selected</Badge>
                      </div>
                      {subs.length === 0 ? (
                        <small className="text-muted">No subcategories available</small>
                      ) : (
                        <div className="d-flex flex-wrap gap-2">
                          {subs.map((sub) => {
                            const isSubSelected = selectedSubs.includes(sub);
                            return (
                              <Button key={sub} size="sm"
                                variant={isSubSelected ? "primary" : "outline-secondary"}
                                onClick={() => toggleSubcategory(catName, sub, false)}
                                type="button">
                                {isSubSelected ? "✓ " : "+ "}{sub}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </Form.Group>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Initial Stock</Form.Label>
                  <Form.Control type="number" placeholder="Enter stock"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })} min="0" />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold mt-3">
              <FaSitemap className="me-2" /> Product Variants (Color / Size / Image)
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <div className="d-flex justify-content-end mb-2">
              <Button size="sm" variant="outline-primary" type="button"
                onClick={() => addVariantRow(false)}>
                <FaPlus size={12} className="me-1" /> Add Variant
              </Button>
            </div>

            {(!newProduct.variants || newProduct.variants.length === 0) ? (
              <Alert variant="light" className="text-center text-muted small">
                No variants added yet. Click "Add Variant" to add one.
              </Alert>
            ) : (
              newProduct.variants.map((variant, idx) => (
                <Card key={idx} className="mb-3 p-3 bg-light">
                  <Row className="align-items-center g-2">
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="small">Color</Form.Label>
                        <Form.Control size="sm" placeholder="Red"
                          value={variant.color || ""}
                          onChange={(e) => updateVariantField(idx, "color", e.target.value, false)} />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="small">Size</Form.Label>
                        <Form.Control size="sm" placeholder="M"
                          value={variant.size || ""}
                          onChange={(e) => updateVariantField(idx, "size", e.target.value, false)} />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="small">Stock</Form.Label>
                        <Form.Control size="sm" type="number" min="0"
                          value={variant.stock || 0}
                          onChange={(e) => updateVariantField(idx, "stock", parseInt(e.target.value) || 0, false)} />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="small">Price</Form.Label>
                        <Form.Control size="sm" type="number" min="0"
                          value={variant.price || 0}
                          onChange={(e) => updateVariantField(idx, "price", parseFloat(e.target.value) || 0, false)} />
                      </Form.Group>
                    </Col>
                    <Col md={2}>
                      <Form.Group>
                        <Form.Label className="small">Image</Form.Label>
                        <Form.Control size="sm" type="file" accept="image/*"
                          onChange={(e) => handleVariantImageChange(idx, e.target.files[0], false)} />
                      </Form.Group>
                    </Col>
                    <Col md={1}>
                      <Form.Check type="checkbox" label="Avail"
                        checked={variant.isAvailable !== false}
                        onChange={(e) => updateVariantField(idx, "isAvailable", e.target.checked, false)} />
                    </Col>
                    <Col md={1}>
                      <Button size="sm" variant="outline-danger" type="button"
                        onClick={() => removeVariantRow(idx, false)}>
                        <FaTimes />
                      </Button>
                    </Col>
                  </Row>
                  {variant.imagePreview && (
                    <div className="mt-2">
                      <img src={variant.imagePreview} alt="Variant"
                        style={{ maxHeight: 60, borderRadius: 6, border: "1px solid #ddd" }} />
                    </div>
                  )}
                </Card>
              ))
            )}

            <Form.Label className="fw-bold mt-2">
              <FaWeight className="me-2" /> Size & Weight Details
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Size</Form.Label>
                  <Form.Control placeholder="e.g., M, L"
                    value={newProduct.size}
                    onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Weight</Form.Label>
                  <Form.Control type="number" placeholder="250"
                    value={newProduct.weight}
                    onChange={(e) => setNewProduct({ ...newProduct, weight: parseFloat(e.target.value) || 0 })}
                    min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Weight Unit</Form.Label>
                  <Form.Select value={newProduct.weightUnit}
                    onChange={(e) => setNewProduct({ ...newProduct, weightUnit: e.target.value })}>
                    <option value="">Select Unit</option>
                    <option value="g">Gram (g)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="L">Liter (L)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>SKU</Form.Label>
                  <Form.Control placeholder="e.g., PRD-001"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Variant (text)</Form.Label>
                  <Form.Control placeholder="e.g., Red, Blue"
                    value={newProduct.variant}
                    onChange={(e) => setNewProduct({ ...newProduct, variant: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold">
              <FaRulerCombined className="me-2" /> Dimensions
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Length</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.dimensions?.length || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      dimensions: { ...newProduct.dimensions, length: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Width</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.dimensions?.width || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      dimensions: { ...newProduct.dimensions, width: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Height</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.dimensions?.height || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      dimensions: { ...newProduct.dimensions, height: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Unit</Form.Label>
                  <Form.Select value={newProduct.dimensions?.unit || "cm"}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      dimensions: { ...newProduct.dimensions, unit: e.target.value }
                    })}>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                    <option value="mm">mm</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold mt-2">
              <FaTruck className="me-2" /> Shipping Information
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Shipping Time *</Form.Label>
                  <Form.Select value={newProduct.shippingTime || "3-5 days"}
                    onChange={(e) => setNewProduct({ ...newProduct, shippingTime: e.target.value })}>
                    {shippingOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Custom Shipping Time</Form.Label>
                  <Form.Control placeholder="e.g., Ships within 1 week"
                    value={newProduct.customShippingTime || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, customShippingTime: e.target.value })}
                    disabled={newProduct.shippingTime !== "Custom"} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Delivery Days</Form.Label>
                  <Form.Control type="number" min="1"
                    value={newProduct.estimatedDeliveryDays?.min || 3}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      estimatedDeliveryDays: { ...newProduct.estimatedDeliveryDays, min: parseInt(e.target.value) || 1 }
                    })} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Delivery Days</Form.Label>
                  <Form.Control type="number" min="1"
                    value={newProduct.estimatedDeliveryDays?.max || 5}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      estimatedDeliveryDays: { ...newProduct.estimatedDeliveryDays, max: parseInt(e.target.value) || 1 }
                    })} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Shipping Charge (₹)</Form.Label>
                  <Form.Control type="number" min="0" step="0.5"
                    value={newProduct.shippingCharge || 0}
                    onChange={(e) => setNewProduct({ ...newProduct, shippingCharge: parseFloat(e.target.value) || 0 })} />
                  <small className="text-muted">0 = Free Shipping</small>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check type="checkbox" label="Free Shipping"
                checked={newProduct.isFreeShipping !== undefined ? newProduct.isFreeShipping : true}
                onChange={(e) => setNewProduct({ ...newProduct, isFreeShipping: e.target.checked })} />
            </Form.Group>

            <Form.Label className="fw-bold mt-3">
              <FaInfoCircle className="me-2" /> Ingredients & Nutritional Info
            </Form.Label>
            <hr className="mt-1 mb-3" />

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Ingredients</Form.Label>
                  <Form.Control as="textarea" rows={3} placeholder="Enter ingredients"
                    value={newProduct.ingredients}
                    onChange={(e) => setNewProduct({ ...newProduct, ingredients: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Ingredients List (Detailed)</Form.Label>
                  <Form.Control as="textarea" rows={2} placeholder="Comma-separated"
                    value={newProduct.ingredientsList ? newProduct.ingredientsList.join(', ') : ''}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      ingredientsList: e.target.value.split(',').map(i => i.trim()).filter(i => i)
                    })} />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Allergens</Form.Label>
                  <Form.Control as="textarea" rows={2} placeholder="e.g., Wheat, Nuts"
                    value={newProduct.allergens ? newProduct.allergens.join(', ') : ''}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      allergens: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                    })} />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold mt-2">
              <FaClipboardList className="me-2" /> Nutritional Information (per serving)
            </Form.Label>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Serving Size</Form.Label>
                  <Form.Control placeholder="e.g., 100g"
                    value={newProduct.nutritionalInfo?.servingSize || ''}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, servingSize: e.target.value }
                    })} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Calories</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.calories || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, calories: parseFloat(e.target.value) || 0 }
                    })} min="0" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Protein (g)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.protein || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, protein: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Carbohydrates (g)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.carbohydrates || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, carbohydrates: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fat (g)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.fat || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, fat: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Sugar (g)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.sugar || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, sugar: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fiber (g)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.fiber || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, fiber: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sodium (mg)</Form.Label>
                  <Form.Control type="number" placeholder="0"
                    value={newProduct.nutritionalInfo?.sodium || 0}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      nutritionalInfo: { ...newProduct.nutritionalInfo, sodium: parseFloat(e.target.value) || 0 }
                    })} min="0" step="0.1" />
                </Form.Group>
              </Col>
            </Row>

            <Form.Label className="fw-bold mt-2">
              <FaLeaf className="me-2" /> Dietary Information
            </Form.Label>
            <Row>
              <Col md={4}>
                <Form.Check type="checkbox" label="🌱 Vegetarian"
                  checked={newProduct.dietaryInfo?.isVegetarian || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isVegetarian: e.target.checked }
                  })} />
              </Col>
              <Col md={4}>
                <Form.Check type="checkbox" label="🌿 Vegan"
                  checked={newProduct.dietaryInfo?.isVegan || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isVegan: e.target.checked }
                  })} />
              </Col>
              <Col md={4}>
                <Form.Check type="checkbox" label="🌾 Gluten Free"
                  checked={newProduct.dietaryInfo?.isGlutenFree || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isGlutenFree: e.target.checked }
                  })} />
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Check type="checkbox" label="🥛 Dairy Free"
                  checked={newProduct.dietaryInfo?.isDairyFree || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isDairyFree: e.target.checked }
                  })} />
              </Col>
              <Col md={4}>
                <Form.Check type="checkbox" label="🥜 Nut Free"
                  checked={newProduct.dietaryInfo?.isNutFree || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isNutFree: e.target.checked }
                  })} />
              </Col>
              <Col md={4}>
                <Form.Check type="checkbox" label="🌻 Organic"
                  checked={newProduct.dietaryInfo?.isOrganic || false}
                  onChange={(e) => setNewProduct({
                    ...newProduct,
                    dietaryInfo: { ...newProduct.dietaryInfo, isOrganic: e.target.checked }
                  })} />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description *</Form.Label>
              <Form.Control as="textarea" rows={3} placeholder="Enter description"
                required
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
              <small className="text-muted">Description is required</small>
            </Form.Group>

            <Form.Group className="mb-3 p-3 border rounded" style={{ background: "#f8f9fa" }}>
              <Form.Check
                type="checkbox"
                id="add-custom-field-toggle"
                label={<strong>Enable Custom Field (customer will type their own info)</strong>}
                checked={newProduct.customField?.enabled || false}
                onChange={(e) => setNewProduct({
                  ...newProduct,
                  customField: {
                    enabled: e.target.checked,
                    label: newProduct.customField?.label || ""
                  }
                })}
              />

              {newProduct.customField?.enabled && (
                <Form.Group className="mt-3">
                  <Form.Label>Custom Field Name *</Form.Label>
                  <Form.Control
                    placeholder="e.g., Name to Print"
                    value={newProduct.customField?.label || ""}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      customField: { ...newProduct.customField, label: e.target.value }
                    })}
                  />
                  <small className="text-muted">
                    This name will be shown as the label above the input on the product page.
                  </small>
                </Form.Group>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">
                <FaImage className="me-2" /> Product Images (Main) *
                <Badge bg="secondary" className="ms-2">
                  {newProduct.images?.length || 0} selected
                </Badge>
              </Form.Label>
              <Form.Control type="file" multiple accept="image/*" required
                onChange={(e) => setNewProduct({ ...newProduct, images: Array.from(e.target.files) })} />
              <small className="text-muted">
                <strong>Required:</strong> Upload at least one image. First image = main image. Use ← → to reorder.
              </small>
            </Form.Group>

            {newProduct.images && newProduct.images.length > 0 && (
              <div className="d-flex flex-wrap gap-2 mb-3">
                {newProduct.images.map((file, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`preview-${idx}`}
                      style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                    />
                    <Badge bg={idx === 0 ? 'success' : 'secondary'} style={{
                      position: 'absolute', top: 2, left: 2, fontSize: 10
                    }}>
                      {idx === 0 ? '★ Main' : `#${idx + 1}`}
                    </Badge>
                    <div style={{ position: 'absolute', bottom: 2, left: 2, display: 'flex', gap: 2 }}>
                      <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                        onClick={() => moveAddImage(idx, idx - 1)} disabled={idx === 0}>←</Button>
                      <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                        onClick={() => moveAddImage(idx, idx + 1)} disabled={idx === newProduct.images.length - 1}>→</Button>
                    </div>
                    <Button size="sm" variant="danger" style={{
                      position: 'absolute', top: 2, right: 2, padding: '0 5px', fontSize: 10
                    }} onClick={() => removeAddImage(idx)}>×</Button>
                  </div>
                ))}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAddProduct}>Add Product</Button>
        </Modal.Footer>
      </Modal>

      {/* ================= EDIT MODAL ================= */}
      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Edit Product</Modal.Title></Modal.Header>
        {editData && (
          <Modal.Body>
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Product Name</Form.Label>
                    <Form.Control value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Price (₹)</Form.Label>
                    <Form.Control type="number" value={editData.price}
                      onChange={(e) => setEditData({ ...editData, price: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  <FaSitemap className="me-2" />
                  Categories (Multiple)
                  <Badge bg="secondary" className="ms-2">
                    {editData.categories?.length || 0} selected
                  </Badge>
                </Form.Label>
                <div style={{
                  maxHeight: "200px", overflowY: "auto", padding: "10px",
                  border: "1px solid #dee2e6", borderRadius: "8px", background: "#f8f9fa",
                }}>
                  {categories.map((category) => {
                    const isSelected = (editData.categories || []).includes(category.name);
                    return (
                      <Form.Check key={category._id} type="checkbox"
                        id={`edit-cat-${category._id}`}
                        label={category.name}
                        checked={isSelected}
                        onChange={() => toggleCategory(category.name, true)}
                        className="mb-2" />
                    );
                  })}
                </div>
              </Form.Group>

              {(editData.categories || []).length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    <FaSitemap className="me-2" /> Sub-Categories per Category
                  </Form.Label>
                  {(editData.categories || []).map((catName) => {
                    const subs = categorySubCategories[catName] || [];
                    const selectedSubs = editData.categorySubcategoryMap?.[catName] || [];
                    return (
                      <Card key={catName} className="mb-2 p-2">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong>{catName}</strong>
                          <Badge bg="info">{selectedSubs.length} selected</Badge>
                        </div>
                        {subs.length === 0 ? (
                          <small className="text-muted">No subcategories available</small>
                        ) : (
                          <div className="d-flex flex-wrap gap-2">
                            {subs.map((sub) => {
                              const isSubSelected = selectedSubs.includes(sub);
                              return (
                                <Button key={sub} size="sm"
                                  variant={isSubSelected ? "primary" : "outline-secondary"}
                                  onClick={() => toggleSubcategory(catName, sub, true)}
                                  type="button">
                                  {isSubSelected ? "✓ " : "+ "}{sub}
                                </Button>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </Form.Group>
              )}

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Stock</Form.Label>
                    <Form.Control type="number" value={editData.stock || 0}
                      onChange={(e) => setEditData({ ...editData, stock: parseInt(e.target.value) || 0 })} min="0" />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Label className="fw-bold mt-3">
                <FaSitemap className="me-2" /> Product Variants
              </Form.Label>
              <hr className="mt-1 mb-3" />

              <div className="d-flex justify-content-end mb-2">
                <Button size="sm" variant="outline-primary" type="button"
                  onClick={() => addVariantRow(true)}>
                  <FaPlus size={12} className="me-1" /> Add Variant
                </Button>
              </div>

              {(!editData.variants || editData.variants.length === 0) ? (
                <Alert variant="light" className="text-center text-muted small">
                  No variants. Click "Add Variant" to add one.
                </Alert>
              ) : (
                editData.variants.map((variant, idx) => (
                  <Card key={idx} className="mb-3 p-3 bg-light">
                    <Row className="align-items-center g-2">
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label className="small">Color</Form.Label>
                          <Form.Control size="sm" value={variant.color || ""}
                            onChange={(e) => updateVariantField(idx, "color", e.target.value, true)} />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label className="small">Size</Form.Label>
                          <Form.Control size="sm" value={variant.size || ""}
                            onChange={(e) => updateVariantField(idx, "size", e.target.value, true)} />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label className="small">Stock</Form.Label>
                          <Form.Control size="sm" type="number" value={variant.stock || 0}
                            onChange={(e) => updateVariantField(idx, "stock", parseInt(e.target.value) || 0, true)} />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label className="small">Price</Form.Label>
                          <Form.Control size="sm" type="number" value={variant.price || 0}
                            onChange={(e) => updateVariantField(idx, "price", parseFloat(e.target.value) || 0, true)} />
                        </Form.Group>
                      </Col>
                      <Col md={2}>
                        <Form.Group>
                          <Form.Label className="small">Image</Form.Label>
                          <Form.Control size="sm" type="file" accept="image/*"
                            onChange={(e) => handleVariantImageChange(idx, e.target.files[0], true)} />
                        </Form.Group>
                      </Col>
                      <Col md={1}>
                        <Form.Check type="checkbox" label="Avail"
                          checked={variant.isAvailable !== false}
                          onChange={(e) => updateVariantField(idx, "isAvailable", e.target.checked, true)} />
                      </Col>
                      <Col md={1}>
                        <Button size="sm" variant="outline-danger" type="button"
                          onClick={() => removeVariantRow(idx, true)}>
                          <FaTimes />
                        </Button>
                      </Col>
                    </Row>
                    {(variant.imagePreview || variant.existingImage) && (
                      <div className="mt-2">
                        <img src={variant.imagePreview || `${BASE_URL}${variant.existingImage}`}
                          alt="Variant" style={{ maxHeight: 60, borderRadius: 6, border: "1px solid #ddd" }} />
                      </div>
                    )}
                  </Card>
                ))
              )}

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Size</Form.Label>
                    <Form.Control placeholder="e.g., M"
                      value={editData.size || ""}
                      onChange={(e) => setEditData({ ...editData, size: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Weight</Form.Label>
                    <Form.Control type="number" value={editData.weight || 0}
                      onChange={(e) => setEditData({ ...editData, weight: parseFloat(e.target.value) || 0 })} min="0" />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Weight Unit</Form.Label>
                    <Form.Select value={editData.weightUnit || ""}
                      onChange={(e) => setEditData({ ...editData, weightUnit: e.target.value })}>
                      <option value="">Select Unit</option>
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="L">Liter (L)</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>SKU</Form.Label>
                    <Form.Control placeholder="e.g., PRD-001"
                      value={editData.sku || ""}
                      onChange={(e) => setEditData({ ...editData, sku: e.target.value })} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Variant</Form.Label>
                    <Form.Control placeholder="e.g., Red, Blue"
                      value={editData.variant || ""}
                      onChange={(e) => setEditData({ ...editData, variant: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Length</Form.Label>
                    <Form.Control type="number" value={editData.dimensions?.length || 0}
                      onChange={(e) => setEditData({
                        ...editData,
                        dimensions: { ...editData.dimensions, length: parseFloat(e.target.value) || 0 }
                      })} min="0" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Width</Form.Label>
                    <Form.Control type="number" value={editData.dimensions?.width || 0}
                      onChange={(e) => setEditData({
                        ...editData,
                        dimensions: { ...editData.dimensions, width: parseFloat(e.target.value) || 0 }
                      })} min="0" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Height</Form.Label>
                    <Form.Control type="number" value={editData.dimensions?.height || 0}
                      onChange={(e) => setEditData({
                        ...editData,
                        dimensions: { ...editData.dimensions, height: parseFloat(e.target.value) || 0 }
                      })} min="0" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Unit</Form.Label>
                    <Form.Select value={editData.dimensions?.unit || "cm"}
                      onChange={(e) => setEditData({
                        ...editData,
                        dimensions: { ...editData.dimensions, unit: e.target.value }
                      })}>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                      <option value="mm">mm</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Shipping Time</Form.Label>
                    <Form.Select value={editData.shippingTime || "3-5 days"}
                      onChange={(e) => setEditData({ ...editData, shippingTime: e.target.value })}>
                      {shippingOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Custom Shipping Time</Form.Label>
                    <Form.Control value={editData.customShippingTime || ""}
                      onChange={(e) => setEditData({ ...editData, customShippingTime: e.target.value })}
                      disabled={editData.shippingTime !== "Custom"} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Shipping Charge (₹)</Form.Label>
                    <Form.Control type="number" value={editData.shippingCharge || 0}
                      onChange={(e) => setEditData({ ...editData, shippingCharge: parseFloat(e.target.value) || 0 })} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Min Delivery Days</Form.Label>
                    <Form.Control type="number" value={editData.estimatedDeliveryDays?.min || 3}
                      onChange={(e) => setEditData({
                        ...editData,
                        estimatedDeliveryDays: { ...editData.estimatedDeliveryDays, min: parseInt(e.target.value) || 1 }
                      })} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Max Delivery Days</Form.Label>
                    <Form.Control type="number" value={editData.estimatedDeliveryDays?.max || 5}
                      onChange={(e) => setEditData({
                        ...editData,
                        estimatedDeliveryDays: { ...editData.estimatedDeliveryDays, max: parseInt(e.target.value) || 1 }
                      })} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Check type="checkbox" label="Free Shipping"
                  checked={editData.isFreeShipping !== undefined ? editData.isFreeShipping : true}
                  onChange={(e) => setEditData({ ...editData, isFreeShipping: e.target.checked })} />
              </Form.Group>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Ingredients</Form.Label>
                    <Form.Control as="textarea" rows={2}
                      value={editData.ingredients || ""}
                      onChange={(e) => setEditData({ ...editData, ingredients: e.target.value })} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Allergens</Form.Label>
                    <Form.Control as="textarea" rows={2}
                      value={editData.allergens ? editData.allergens.join(', ') : ''}
                      onChange={(e) => setEditData({
                        ...editData,
                        allergens: e.target.value.split(',').map(a => a.trim()).filter(a => a)
                      })} />
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Description *</Form.Label>
                <Form.Control as="textarea" rows={3}
                  required
                  value={editData.description || ""}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })} />
                <small className="text-muted">Description is required</small>
              </Form.Group>

              {/* ✅ FIXED: Edit modal custom field now bound to editData (was newProduct) */}
              <Form.Group className="mb-3 p-3 border rounded" style={{ background: "#f8f9fa" }}>
                <Form.Check
                  type="checkbox"
                  id="edit-custom-field-toggle"
                  label={<strong>Enable Custom Field (customer will type their own info)</strong>}
                  checked={editData.customField?.enabled || false}
                  onChange={(e) => setEditData({
                    ...editData,
                    customField: {
                      enabled: e.target.checked,
                      label: editData.customField?.label || "",
                      value: editData.customField?.value || ""
                    }
                  })}
                />

                {editData.customField?.enabled && (
                  <Form.Group className="mt-3">
                    <Form.Label>Custom Field Name *</Form.Label>
                    <Form.Control
                      placeholder="e.g., Name to Print"
                      value={editData.customField?.label || ""}
                      onChange={(e) => setEditData({
                        ...editData,
                        customField: { ...editData.customField, label: e.target.value }
                      })}
                    />
                    <small className="text-muted">
                      This name will be shown as the label above the input on the product page.
                    </small>
                  </Form.Group>
                )}
              </Form.Group>

              {/* EXISTING IMAGES */}
              {editData.image && editData.image.length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">
                    <FaImage className="me-2" /> Current Images (order)
                    <Badge bg="secondary" className="ms-2">{editData.image.length}</Badge>
                  </Form.Label>
                  <div className="d-flex flex-wrap gap-2">
                    {editData.image.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img
                          src={buildImageUrl(img)}
                          alt={`existing-${idx}`}
                          style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }}
                        />
                        <Badge bg={idx === 0 ? 'success' : 'secondary'} style={{
                          position: 'absolute', top: 2, left: 2, fontSize: 10
                        }}>
                          {idx === 0 ? '★ Main' : `#${idx + 1}`}
                        </Badge>
                        <div style={{ position: 'absolute', bottom: 2, left: 2, display: 'flex', gap: 2 }}>
                          <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                            onClick={() => moveExistingImage(idx, idx - 1)} disabled={idx === 0}>←</Button>
                          <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                            onClick={() => moveExistingImage(idx, idx + 1)} disabled={idx === editData.image.length - 1}>→</Button>
                        </div>
                        <Button size="sm" variant="danger" style={{
                          position: 'absolute', top: 2, right: 2, padding: '0 5px', fontSize: 10
                        }} onClick={() => removeExistingImage(idx)}>×</Button>
                      </div>
                    ))}
                  </div>
                </Form.Group>
              )}

              {/* ADD NEW IMAGES */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">
                  <FaImage className="me-2" /> Add New Images
                  {(!editData.image || editData.image.length === 0) && " *"}
                </Form.Label>
                <Form.Control type="file" multiple accept="image/*"
                  required={!editData.image || editData.image.length === 0}
                  onChange={(e) => setEditData({ ...editData, newImages: Array.from(e.target.files) })} />
                <small className="text-muted">
                  {(!editData.image || editData.image.length === 0)
                    ? "Required: Upload at least one image (no existing images found)."
                    : "New images will be appended after the existing images."}
                </small>
              </Form.Group>

              {editData.newImages && editData.newImages.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {editData.newImages.map((file, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`new-${idx}`}
                        style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6, border: '2px solid #0d6efd' }}
                      />
                      <Badge bg="primary" style={{ position: 'absolute', top: 2, left: 2, fontSize: 10 }}>
                        NEW #{idx + 1}
                      </Badge>
                      <div style={{ position: 'absolute', bottom: 2, left: 2, display: 'flex', gap: 2 }}>
                        <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                          onClick={() => moveNewImage(idx, idx - 1)} disabled={idx === 0}>←</Button>
                        <Button size="sm" variant="light" style={{ padding: '0 6px', fontSize: 10 }}
                          onClick={() => moveNewImage(idx, idx + 1)} disabled={idx === editData.newImages.length - 1}>→</Button>
                      </div>
                      <Button size="sm" variant="danger" style={{
                        position: 'absolute', top: 2, right: 2, padding: '0 5px', fontSize: 10
                      }} onClick={() => removeNewImage(idx)}>×</Button>
                    </div>
                  ))}
                </div>
              )}
            </Form>
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveEdit}>Save Changes</Button>
        </Modal.Footer>
      </Modal>

      {/* ================= STOCK MODAL ================= */}
      <Modal show={showStockModal} onHide={() => setShowStockModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaBoxes className="me-2" /> Manage Stock: {stockUpdateData.productName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Alert variant="info"><strong>Current Stock:</strong> {stockUpdateData.currentStock} units</Alert>
            <Form.Group className="mb-3">
              <Form.Label>Operation</Form.Label>
              <Form.Select value={stockUpdateData.operation}
                onChange={(e) => setStockUpdateData({
                  ...stockUpdateData, operation: e.target.value, quantity: 0,
                  newStock: e.target.value === "set" ? stockUpdateData.currentStock : 0
                })}>
                <option value="set">Set Exact Stock</option>
                <option value="add">Add to Stock (+)</option>
                <option value="subtract">Subtract from Stock (-)</option>
              </Form.Select>
            </Form.Group>
            {stockUpdateData.operation === "set" && (
              <Form.Group className="mb-3">
                <Form.Label>New Stock Quantity</Form.Label>
                <Form.Control type="number" min="0"
                  value={stockUpdateData.newStock}
                  onChange={(e) => setStockUpdateData({ ...stockUpdateData, newStock: parseInt(e.target.value) || 0 })} />
              </Form.Group>
            )}
            {(stockUpdateData.operation === "add" || stockUpdateData.operation === "subtract") && (
              <Form.Group className="mb-3">
                <Form.Label>{stockUpdateData.operation === "add" ? "Quantity to Add" : "Quantity to Subtract"}</Form.Label>
                <Form.Control type="number" min="1"
                  value={stockUpdateData.quantity}
                  onChange={(e) => {
                    const quantity = parseInt(e.target.value) || 0;
                    let newStock = stockUpdateData.currentStock;
                    if (stockUpdateData.operation === "add") newStock = stockUpdateData.currentStock + quantity;
                    else if (stockUpdateData.operation === "subtract") newStock = Math.max(0, stockUpdateData.currentStock - quantity);
                    setStockUpdateData({ ...stockUpdateData, quantity, newStock });
                  }} />
              </Form.Group>
            )}
            <Alert variant="warning">
              <FaExclamationCircle className="me-2" />
              <strong>New Stock After Update:</strong> {stockUpdateData.newStock} units
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleStockUpdate}
            disabled={stockUpdateData.newStock < 0}>
            <FaCheckCircle className="me-1" /> Update Stock
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ================= BULK UPLOAD MODAL ================= */}
      <Modal show={showBulkUpload} onHide={() => { setShowBulkUpload(false); resetBulkUpload(); }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaFileExcel className="me-2" /> Bulk Upload Products
            <Badge bg="info" className="ms-2">Amazon-Style</Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {uploadStep === 1 && (
            <>
              <div className="mb-4 p-3 bg-light rounded">
                <h6>📋 How to Bulk Upload</h6>
                <ol className="small mb-0">
                  <li>Download the Excel template below</li>
                  <li>Fill in your product details</li>
                  <li>Upload the filled Excel file</li>
                  <li>Review the validation preview</li>
                  <li>Confirm and process</li>
                </ol>
              </div>
              <div className="mb-3">
                <Button variant="info" onClick={downloadTemplate} className="mb-3">
                  <FaDownload className="me-2" /> Download Excel Template
                </Button>
              </div>
              <Form.Group className="mb-3">
                <Form.Label>📊 Select Excel File (.xlsx, .xls) *</Form.Label>
                <Form.Control type="file" accept=".xlsx,.xls"
                  onChange={(e) => setExcelFile(e.target.files[0])}
                  disabled={uploadProgress} />
                {excelFile && <small className="text-success">✅ {excelFile.name}</small>}
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>🖼️ Upload Product Images (Optional)</Form.Label>
                <Form.Control type="file" multiple accept="image/*"
                  onChange={(e) => setBulkImages(Array.from(e.target.files))}
                  disabled={uploadProgress} />
                {bulkImages.length > 0 && (
                  <small className="text-success">✅ {bulkImages.length} image(s) selected</small>
                )}
              </Form.Group>
            </>
          )}

          {uploadStep === 2 && validationData && (
            <>
              <div className="mb-4">
                <h6>📊 Validation Summary</h6>
                <Row className="g-2">
                  <Col xs={6} md={3}>
                    <Card className="bg-primary text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.total}</h6>
                        <small>Total</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-success text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.valid}</h6>
                        <small>Valid</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-danger text-white text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.invalid}</h6>
                        <small>Invalid</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col xs={6} md={3}>
                    <Card className="bg-warning text-dark text-center">
                      <Card.Body className="py-2">
                        <h6 className="mb-0">{validationData.summary.warning}</h6>
                        <small>Warnings</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
              {validationData.errors && validationData.errors.length > 0 && (
                <Alert variant="danger" className="mt-2">
                  <Alert.Heading>❌ Errors</Alert.Heading>
                  <ul className="mb-0 small">
                    {validationData.errors.slice(0, 10).map((err, idx) => <li key={idx}>{err}</li>)}
                  </ul>
                </Alert>
              )}
            </>
          )}

          {uploadProgress && (
            <div className="mt-3">
              <div className="d-flex justify-content-between mb-1">
                <span>Processing...</span>
                <span>{processingProgress}%</span>
              </div>
              <div className="progress" style={{ height: '20px' }}>
                <div className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{ width: `${processingProgress}%` }}>{processingProgress}%</div>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="mt-3 p-3 rounded bg-success bg-opacity-10">
              <h6>✅ Upload Complete!</h6>
              <p className="mb-1">📊 Total: {uploadResult.summary.total}</p>
              <p className="mb-1">✅ Successful: {uploadResult.summary.successful}</p>
              <p className="mb-1">❌ Failed: {uploadResult.summary.failed}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {uploadStep === 1 && !uploadResult && (
            <>
              <Button variant="secondary" onClick={() => { setShowBulkUpload(false); resetBulkUpload(); }}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleValidateExcel}
                disabled={!excelFile || uploadProgress}>
                {uploadProgress ? "Validating..." : "Validate & Preview"}
              </Button>
            </>
          )}
          {uploadStep === 2 && !uploadResult && !uploadProgress && (
            <>
              <Button variant="secondary" onClick={() => { setUploadStep(1); setValidationData(null); }}>
                <FaArrowLeft className="me-1" /> Back
              </Button>
              <Button variant="success" onClick={handleProcessBulkUpload}
                disabled={validationData.summary.valid === 0 || uploadProgress}>
                {uploadProgress ? "Processing..." : `Upload ${validationData.summary.valid} Products`}
                <FaArrowRight className="ms-1" />
              </Button>
            </>
          )}
          {uploadProgress && (
            <Button variant="secondary" disabled>
              <Spinner animation="border" size="sm" className="me-2" /> Processing...
            </Button>
          )}
          {uploadResult && (
            <Button variant="primary" onClick={() => { setShowBulkUpload(false); resetBulkUpload(); }}>
              Done
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Product;