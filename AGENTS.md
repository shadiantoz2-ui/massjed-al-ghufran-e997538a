<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the admin assistant on the authenticated route tree; verify the database-backed admin role on every history, reset, streaming, and statistics entry point because navigation alone is not authorization.
- Persist one UIMessage-compatible conversation per admin, and use generation compare-and-swap for sends/resets so concurrent tabs cannot overwrite another conversation.
- Use a validated date/name/course planner and an invoker-rights read-only statistics RPC for assistant data; never execute model-generated SQL or grant the model write tools.
- Adapt Gateway Responses events into the typed NDJSON chat contract and save complete assistant messages only after successful completion; use installed AI Elements for the visible chat surface.
