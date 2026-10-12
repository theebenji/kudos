import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Welcome } from "./Welcome";

const values = [
  { id: "1", name: "Teamwork", emoji: "🤝" },
  { id: "2", name: "Ownership", emoji: null },
];

describe("Welcome", () => {
  it("greets the viewer by first name and shows their role", () => {
    render(
      <Welcome
        viewer={{ name: "Avery Admin", title: "Head of People", role: "ADMIN" }}
        values={values}
        signOutAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Welcome, Avery" })).toBeInTheDocument();
    expect(screen.getByText("Head of People · Admin")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "🤝 Teamwork",
      "Ownership",
    ]);
  });

  it("signs out through the provided action", async () => {
    const signOutAction = vi.fn().mockResolvedValue(undefined);
    render(
      <Welcome
        viewer={{ name: "Morgan", title: null, role: "MEMBER" }}
        values={[]}
        signOutAction={signOutAction}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(signOutAction).toHaveBeenCalledOnce();
  });
});
