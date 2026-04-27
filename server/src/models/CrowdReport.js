const mongoose = require("mongoose");

const CrowdSchema = new mongoose.Schema({

  venueId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Venue"
  },

  status:{
    type:String,
    enum:["busy","quiet"]
  },

  createdAt:{
    type:Date,
    default:Date.now
  }

});

module.exports = mongoose.model("CrowdReport",CrowdSchema);
