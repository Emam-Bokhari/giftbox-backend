import { model, Schema } from "mongoose";
import { TFaq } from "./faq.interface";

const faqSchema = new Schema<TFaq>(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);
export const Faq = model<TFaq>("Faq", faqSchema);
