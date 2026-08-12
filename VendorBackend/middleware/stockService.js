
const Product = require("../models/Product");
const Order = require("../models/Order");

class StockService {

  static async checkStockAvailability(items) {
    const stockIssues = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        stockIssues.push({
          productId: item.productId,
          name: item.name || "Unknown Product",
          issue: "Product not found"
        });
        continue;
      }
      
      const available = Math.max(0, (product.stock || 0) - (product.reservedStock || 0));
      const requested = item.quantity || 1;
      
      if (available < requested) {
        stockIssues.push({
          productId: item.productId,
          name: product.name || item.name,
          requested: requested,
          available: available,
          stockQuantity: product.stock,
          reservedStock: product.reservedStock || 0,
          issue: "Insufficient stock"
        });
      }
    }
    
    return {
      hasStock: stockIssues.length === 0,
      issues: stockIssues
    };
  }

  /**
   * Reserve stock for order
   */
  static async reserveStock(orderId, items) {
    const results = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      
      const available = Math.max(0, (product.stock || 0) - (product.reservedStock || 0));
      if (available < (item.quantity || 1)) {
        throw new Error(`Insufficient stock for ${product.name || item.name}. Available: ${available}, Requested: ${item.quantity}`);
      }
      
      // Reserve the stock
      product.reservedStock = (product.reservedStock || 0) + (item.quantity || 1);
      await product.save();
      
      results.push({
        productId: item.productId,
        name: product.name,
        reserved: item.quantity,
        remainingStock: (product.stock || 0) - (product.reservedStock || 0),
        updatedReservedStock: product.reservedStock
      });
    }
    
    // Update order
    await Order.findByIdAndUpdate(orderId, {
      stockReserved: true
    });
    
    return results;
  }

 
  static async confirmStock(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const reserveAmount = Math.min(item.quantity || 1, product.reservedStock || 0);
        product.stock = Math.max(0, (product.stock || 0) - reserveAmount);
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - reserveAmount);
        await product.save();
      }
    }
    

    await Order.findByIdAndUpdate(orderId, {
      stockReserved: false,
      stockConfirmed: true
    });
    
    return { success: true, orderId };
  }


  static async releaseStock(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    if (!order.stockReserved) {
      return { success: true, message: "No stock to release" };
    }
    
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const releaseAmount = Math.min(item.quantity || 1, product.reservedStock || 0);
        product.reservedStock = Math.max(0, (product.reservedStock || 0) - releaseAmount);
        await product.save();
      }
    }
    
    // Update order
    await Order.findByIdAndUpdate(orderId, {
      stockReserved: false,
      stockReleased: true
    });
    
    return { success: true, orderId };
  }


  static async logStockMovement(orderId, action, extra = {}) {
    console.log(`[Stock Log] Order ${orderId}: ${action}`, extra);
    
  }
}

module.exports = StockService;