const express = require("express");
const router = express.Router();

const VendorSetting = require("../models/VendorSetting");

const auth = require("../middleware/auth");

// Get Settings
router.get("/", auth, async (req, res) => {
  try {
    let settings =
      await VendorSetting.findOne({
        vendorId: req.user.id,
      });

    if (!settings) {
      settings =
        await VendorSetting.create({
          vendorId: req.user.id,
          company: req.user.company,
        });
    }

    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Update Settings
router.put("/", auth, async (req, res) => {
  try {
    const settings =
      await VendorSetting.findOneAndUpdate(
        {
          vendorId: req.user.id,
        },
        req.body,
        {
          new: true,
          upsert: true,
        }
      );

    res.json({
      success: true,
      settings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;