import { classifyTextGenerationTask } from './ai-task-classifier';

describe('classifyTextGenerationTask', () => {
  it('keeps ordinary requests on the general conversation route', () => {
    expect(classifyTextGenerationTask('What crops are suitable for my farm?')).toBe('CONVERSATION');
  });

  it('routes explicit extraction work to a structured extraction adapter', () => {
    expect(classifyTextGenerationTask('Extract the fields from this receipt')).toBe('STRUCTURED_EXTRACTION');
    expect(classifyTextGenerationTask('Convert this document into a form')).toBe('STRUCTURED_EXTRACTION');
  });

  it('routes analysis and planning to advanced reasoning adapters', () => {
    expect(classifyTextGenerationTask('Compare these two crop plans')).toBe('ADVANCED_REASONING');
    expect(classifyTextGenerationTask('విశ్లేషించండి')).toBe('ADVANCED_REASONING');
  });

  it('does not treat a request to add a record as permission to write it', () => {
    expect(classifyTextGenerationTask('Add a mango crop on one acre')).toBe('CONVERSATION');
  });
});
