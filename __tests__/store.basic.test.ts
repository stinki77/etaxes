/** @jest-environment node */

// мокни модула, за да имаш стабилни named exports
jest.mock("../src/lib/archive", () => ({
  __esModule: true,
  listArchive: jest.fn(async () => [{ id: "x1" }]),
  deleteArchiveItem: jest.fn(async () => true),
}));

import { listArchive, deleteArchiveItem } from "../src/lib/archive";

describe("store basic", () => {
  test("listArchive calls through and returns array", async () => {
    const res = await listArchive({});
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].id).toBe("x1");
    expect(listArchive).toHaveBeenCalledTimes(1);
  });

  test("deleteArchiveItem resolves true", async () => {
    await expect(deleteArchiveItem("x1")).resolves.toBe(true);
    expect(deleteArchiveItem).toHaveBeenCalledWith("x1");
  });
});
