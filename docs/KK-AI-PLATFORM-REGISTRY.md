# KK-AI-PLATFORM-REGISTRY-001 — Central AI Boundary & Context Registry

**Status:** CANONICAL  
**Version:** 1

## Core rule
AI is an intelligence layer, not a system of record.

Canonical chain:

User/Module -> Authorization -> Context Policy -> AI -> Candidate Output -> Registry Validation -> User Confirmation -> Canonical Service -> Audit/History

AI must never bypass this chain.

## AI understanding of KK
AI receives purpose-bound context assembled from authorized canonical records, not an unrestricted User dump.

Context may contain canonical User references, relevant profile/facts/preferences, current module/screen/entity, relevant history and permitted module fields. Secrets and unrelated protected data are excluded.

## Conversation boundary
Conversation is a first-class platform capability and is stored separately from User and domain entities.

Minimum association: userId, moduleId.

Optional association: screenId, entityType, entityId, sessionId, farmId, cropId, cropCycleId, livestockId, marketplace record reference.

Core entities: Conversation, ConversationSession, ConversationParticipant, ConversationMessage, ConversationContext, ConversationReference, ConversationFactCandidate, ConversationAction.

## Candidate fact boundary
AI-extracted information first becomes ConversationFactCandidate.

It carries conversation, user and module references, target entity/field, proposed value, previous value where relevant, confidence, source, evidence, validation state, confirmation state, resolution and provenance.

Lifecycle:
DETECTED -> NORMALIZED -> VALIDATION_PENDING -> AWAITING_CONFIRMATION -> CONFIRMED -> APPLIED

Alternative states: CONFLICT, REJECTED, SUPERSEDED, EXPIRED.

A candidate is never authoritative merely because an AI model produced it.

## Module AI contract
Every AI-consuming module registers:
- stable module ID;
- allowed capabilities;
- allowed context references;
- allowed fields;
- restricted fields;
- candidate fact targets;
- confirmation requirements;
- provenance requirements;
- audit requirements.

Initial associations:
- KK-USER-001 Canonical User Foundation
- KK-FARM-001 Farm
- KK-CROP-001 Crop
- KK-LIVESTOCK-001 Livestock
- KK-MARKETPLACE-001 Marketplace

Additional modules register before consuming protected AI context.

## Authorization order
1. Authenticate.
2. Authorize action.
3. Resolve module/entity context.
4. Apply field/privacy policy.
5. Assemble minimum context.
6. Invoke AI.
7. Validate output.
8. Request confirmation where required.
9. Persist through canonical service/API.
10. Audit/history/provenance.

AI cannot expand its own access.

## Provider abstraction
Providers are replaceable. Initial local ASR is KK-AI-ASR-INDIC-CONFORMER. Future provider categories include conversation, speech, TTS, vision, document extraction, matching, consistency, classification and recommendation.

## Learning boundary
Raw conversations are not silently used to retrain models.

Governed learning:
Conversation -> Candidate -> Validation -> Confirmation -> Canonical Outcome -> Evaluation Dataset -> Review -> Approved Model/Prompt/Policy Version

Learning data requires provenance, privacy, retention and approval.

## God Mode
God Mode must expose providers/models, capabilities, context policies, module associations, field access, conversation policy, fact lifecycle, confirmation, provenance, AI audit and learning governance.

Never expose credentials.

