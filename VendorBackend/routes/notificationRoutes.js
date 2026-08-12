const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// ========== GET NOTIFICATIONS ==========
router.get("/", auth, async (req, res) => {
  try {
    console.log("Fetching notifications for user:", req.user);
    
    // Get company from user
    const company = req.user.company || req.user.companyName;
    
    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Company not found for this user"
      });
    }

    const notifications = await Notification.find({
      company: company,
    }).sort({ createdAt: -1 });

    console.log(`Found ${notifications.length} notifications for company:`, company);

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== GET UNREAD COUNT ==========
router.get("/unread/count", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    
    if (!company) {
      return res.status(400).json({
        success: false,
        message: "Company not found"
      });
    }

    const count = await Notification.countDocuments({
      company: company,
      read: false
    });

    res.json({
      success: true,
      count,
    });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== MARK NOTIFICATION AS READ ==========
router.put("/:id/read", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        company: company,
      },
      {
        read: true,
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== MARK ALL AS READ ==========
router.put("/read-all", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    
    const result = await Notification.updateMany(
      {
        company: company,
        read: false,
      },
      {
        read: true,
      }
    );

    res.json({
      success: true,
      message: `All notifications marked as read (${result.modifiedCount} updated)`,
    });
  } catch (err) {
    console.error("Error marking all as read:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== DELETE NOTIFICATION ==========
router.delete("/:id", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      company: company,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== DELETE ALL NOTIFICATIONS ==========
router.delete("/delete-all", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    
    const result = await Notification.deleteMany({
      company: company,
    });

    res.json({
      success: true,
      message: `All notifications deleted (${result.deletedCount} removed)`,
    });
  } catch (err) {
    console.error("Error deleting all notifications:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== CREATE NOTIFICATION (Internal function) ==========
const createNotification = async (company, title, message, type = "info", link = null) => {
  try {
    if (!company || !title || !message) {
      console.error("Missing required fields for notification:", { company, title, message });
      return null;
    }

    const notification = new Notification({
      company: company,
      title: title,
      message: message,
      type: type || "info",
      link: link || null,
      read: false,
    });
    
    await notification.save();
    console.log(`✅ Notification created for ${company}: ${title}`);
    return notification;
  } catch (err) {
    console.error("Error creating notification:", err);
    return null;
  }
};

// ========== CREATE NOTIFICATION ROUTE (For testing) ==========
router.post("/create", auth, async (req, res) => {
  try {
    const company = req.user.company || req.user.companyName;
    const { title, message, type, link } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
      });
    }
    
    const notification = await createNotification(company, title, message, type, link);
    
    if (!notification) {
      return res.status(500).json({
        success: false,
        message: "Failed to create notification"
      });
    }
    
    res.json({
      success: true,
      notification,
    });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ========== TEST ROUTE ==========
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Notification routes are working!"
  });
});

// ✅ Export router and createNotification function
module.exports = router;
module.exports.createNotification = createNotification;