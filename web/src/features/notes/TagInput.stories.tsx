import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TagInput } from "./TagInput";

const meta: Meta<typeof TagInput> = {
  title: "Notes/TagInput",
  component: TagInput,
  tags: ["autodocs"]
};

export default meta;
type Story = StoryObj<typeof TagInput>;

const withState =
  (initial: string[], suggestions: string[] = []): Story["render"] =>
  (args) => {
    const [tags, setTags] = useState<string[]>(initial);
    return <TagInput {...args} value={tags} onChange={setTags} suggestions={suggestions} />;
  };

export const Empty: Story = {
  render: withState([])
};

export const WithExistingTags: Story = {
  render: withState(["work", "meeting"])
};

export const WithSuggestions: Story = {
  render: withState(["work"], ["work", "home", "errands", "personal", "health", "finance"])
};
