const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

// Get Notifications
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      company: req.user.company,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Mark Read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: req.params.id,
          company: req.user.company,
        },
        {
          read: true,
        },
        { new: true }
      );

    res.json({
      success: true,
      notification,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Delete
router.delete("/:id", auth, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    res.json({
      success: true,
      message: "Deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;