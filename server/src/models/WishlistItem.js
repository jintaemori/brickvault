import mongoose from 'mongoose'

const wishlistItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    setNum: { type: String, required: true, trim: true },
    setName: { type: String, required: true },
    imageUrl: String,
    matching: {
      ignoreColors: { type: Boolean, default: false },
      ignorePrints: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
)

wishlistItemSchema.index({ userId: 1, setNum: 1 }, { unique: true })

export const WishlistItem = mongoose.model('WishlistItem', wishlistItemSchema)
