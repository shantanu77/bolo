ALTER TABLE attempts
  ADD COLUMN evaluation_json JSON NULL AFTER model_response;
