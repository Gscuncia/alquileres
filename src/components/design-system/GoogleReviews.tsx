import React from "react";
import { StarIcon } from "./icons";

export interface Review {
  author: string;
  text: string;
}

export interface GoogleReviewsProps {
  rating: number;
  reviewCount: number;
  reviews: Review[];
  profileUrl: string;
}

export const GoogleReviews: React.FC<GoogleReviewsProps> = ({
  rating,
  reviewCount,
  reviews,
  profileUrl,
}) => {
  return (
    <section className="bg-surface-soft py-12 lg:py-section">
      <div className="mx-auto max-w-[1440px] px-4 md:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-display-md font-bold text-ink">
            Lo que dicen nuestros huéspedes
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-canvas px-4 py-2 shadow-card">
            <span className="text-display-sm font-bold text-ink">{rating.toFixed(1)}</span>
            <div className="flex text-ink">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-4 w-4 ${i < Math.round(rating) ? "fill-current" : "text-muted-soft"}`}
                />
              ))}
            </div>
            <span className="text-body-sm text-muted">
              {reviewCount} opiniones en Google
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <article
              key={index}
              className="rounded-md bg-canvas p-6 shadow-card"
            >
              <div className="mb-3 flex text-ink">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mb-4 text-body-md text-body">
                &ldquo;{review.text}&rdquo;
              </p>
              <p className="text-body-sm font-semibold text-ink">
                — {review.author}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-canvas px-6 py-3 text-button-md font-medium text-ink transition-colors hover:bg-surface-soft"
          >
            Ver más opiniones en Google
          </a>
        </div>
      </div>
    </section>
  );
};
