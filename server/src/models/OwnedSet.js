import mongoose from 'mongoose'

const partSchema = new mongoose.Schema(
  {
    canonicalId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['part', 'minifig'], required: true },
    designId: String,
    partNum: String,
    basePartNum: String,
    isPrinted: { type: Boolean, default: false },
    colorId: Number,
    colorName: String,
    rebrickableId: String,
    brickOwlBoid: String,
    qtyPerSet: { type: Number, required: true, min: 1 },
    imageUrl: String,
  },
  { _id: false },
)

const ownedSetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    setNum: { type: String, required: true, trim: true },
    setName: { type: String, required: true },
    copyCount: { type: Number, required: true, min: 1, default: 1 },
    excludeFromBuild: { type: Boolean, default: false },
    excludeCount: { type: Number, min: 1, default: null },
    parts: { type: [partSchema], default: [] },
    partCount: { type: Number, default: 0 },
    imageUrl: String,
  },
  { timestamps: true },
)

ownedSetSchema.index({ userId: 1, setNum: 1 })

export const OwnedSet = mongoose.model('OwnedSet', ownedSetSchema)
