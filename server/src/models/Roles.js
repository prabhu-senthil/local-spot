import mongoose from "mongoose";

const roleSchema = new mongoose.Schema({
  roles: {
    type: [String],
    default: ["User", "Reviewer", "Admin", "Restaurant-Owner"]
  }
});

const Role = mongoose.model("Role", roleSchema);
export default Role;
