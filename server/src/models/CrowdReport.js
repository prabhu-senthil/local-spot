import mongoose from "mongoose";

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

export default mongoose.model("CrowdReport", CrowdSchema);
