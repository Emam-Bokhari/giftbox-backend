import { FilterQuery, Query, Types } from "mongoose";

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  // SEARCH (generic + safe)
  search(searchableFields: string[]) {
    const searchTerm = this.query.searchTerm as string;

    if (!searchTerm) return this;

    const orConditions: FilterQuery<T>[] = [];

    searchableFields.forEach((field) => {
      orConditions.push({
        [field]: { $regex: searchTerm, $options: "i" },
      } as FilterQuery<T>);
    });

    // ObjectId search support
    if (Types.ObjectId.isValid(searchTerm)) {
      orConditions.push({
        _id: new Types.ObjectId(searchTerm),
      } as FilterQuery<T>);
    }

    this.modelQuery = this.modelQuery.find({
      $or: orConditions,
    });

    return this;
  }

  // FILTER (fully generic)
  filter() {
    const queryObj = { ...this.query };

    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];

    excludeFields.forEach((el) => delete queryObj[el]);

    // remove empty values
    Object.keys(queryObj).forEach((key) => {
      if (
        queryObj[key] === undefined ||
        queryObj[key] === null ||
        queryObj[key] === ""
      ) {
        delete queryObj[key];
      }
    });

    // ONLY valid lottery statuses allowed
    const validStatuses = [
      "DRAFT",
      "SCHEDULED",
      "ACTIVE",
      "ENDED",
      "DRAWN",
    ];

    if (queryObj.status) {
      if (!validStatuses.includes(queryObj.status as string)) {
        delete queryObj.status; // ignore invalid status
      }
    }

    if (Object.keys(queryObj).length > 0) {
      this.modelQuery = this.modelQuery.find(
        queryObj as FilterQuery<T>
      );
    }

    return this;
  }

  //  SORT
  sort() {
    const sort =
      (this.query.sort as string)?.split(",").join(" ") || "-createdAt";

    this.modelQuery = this.modelQuery.sort(sort);

    return this;
  }

  //  PAGINATION
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    const skip = (page - 1) * limit;

    this.modelQuery = this.modelQuery.skip(skip).limit(limit);

    return this;
  }

  //  FIELD SELECTION
  fields() {
    const fields =
      (this.query.fields as string)?.split(",").join(" ") || "-__v";

    this.modelQuery = this.modelQuery.select(fields);

    return this;
  }

  // COUNT META
  async countTotal() {
    const filter = this.modelQuery.getFilter();

    const total = await this.modelQuery.model.countDocuments(filter);

    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;

    return {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    };
  }
}

export default QueryBuilder;