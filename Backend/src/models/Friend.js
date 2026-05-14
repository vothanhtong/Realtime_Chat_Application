import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Nickname/alias: userA đặt cho userB và ngược lại
    nicknameByA: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    nicknameByB: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  {
    timestamps: true,
  }
);

friendSchema.pre("save", function (next) {
  const a = this.userA.toString();
  const b = this.userB.toString();

  if (a > b) {
    this.userA = new mongoose.Types.ObjectId(b);
    this.userB = new mongoose.Types.ObjectId(a);
    // Swap nicknames khi swap users
    [this.nicknameByA, this.nicknameByB] = [this.nicknameByB, this.nicknameByA];
  }

  next();
});

friendSchema.index({ userA: 1, userB: 1 }, { unique: true });

const Friend = mongoose.model("Friend", friendSchema);

export default Friend;