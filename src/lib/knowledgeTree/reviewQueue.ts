import type { ReviewItem } from "./types";

export class ReviewQueue {
  private items: ReviewItem[] = [];

  add(item: ReviewItem) {
    this.items.push(item);
  }

  list() {
    return [...this.items];
  }

  resolve(id: string) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  clear() {
    this.items = [];
  }
}
