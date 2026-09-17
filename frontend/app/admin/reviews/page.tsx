'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { PaginatedResponse, Review } from '@/types';
import { EmptyState } from '@/components/LoadingState';

interface AdminReview extends Review {
  product: { name: string; slug: string };
  user: { firstName: string; lastName: string; email: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);

  async function load() {
    const result = await api.get<PaginatedResponse<AdminReview>>('/reviews/pending?limit=50');
    setReviews(result.items);
  }

  useEffect(() => {
    load();
  }, []);

  async function moderate(id: number, status: 'APPROVED' | 'REJECTED') {
    await api.patch(`/reviews/${id}/moderate`, { status });
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Pending Reviews</h1>
      {reviews.length === 0 ? (
        <EmptyState title="No pending reviews" message="New customer reviews will appear here for approval." />
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{r.product.name}</span>
                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-500">
                {r.user.firstName} {r.user.lastName} ({r.user.email})
              </p>
              <p className="mt-1 text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
              {r.title && <p className="mt-1 font-medium text-gray-900">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-gray-600">{r.body}</p>}
              <div className="mt-3 flex gap-3">
                <button className="btn-secondary" onClick={() => moderate(r.id, 'APPROVED')}>
                  Approve
                </button>
                <button className="btn-danger" onClick={() => moderate(r.id, 'REJECTED')}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
