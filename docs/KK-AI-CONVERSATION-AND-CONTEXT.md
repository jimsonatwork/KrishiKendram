# KK-AI-CONVERSATION-001 — Contextual Conversation & Fact Intelligence

## Objective
Give KK a persistent, context-aware conversation layer that understands the current User, module, screen and entity without turning chat history into the canonical database.

## Four-way separation
**Conversation:** what was discussed.  
**Context:** what KK authorized for this task.  
**Candidate fact:** what AI believes may have been learned.  
**Canonical record:** what KK accepted as authoritative.

## Core entities
Conversation owns the logical User conversation.
ConversationSession represents a visit/session segment and interruption/resumption.
ConversationParticipant identifies User and system/AI participants.
ConversationMessage stores messages with language, provenance and timestamps.
ConversationContext records module/screen/entity context used for a turn.
ConversationReference links to canonical KK records without copying them into chat storage.
ConversationFactCandidate stores AI-proposed facts awaiting validation/confirmation.
ConversationAction stores proposed/completed actions and canonical service results.

## Example
For a User discussing leased land inside Farm:
userId = U1
moduleId = KK-FARM-001
entityType = Land
entityId = L17
farmId = F4

The AI can resolve 
