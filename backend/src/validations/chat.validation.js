const Joi = require('joi');

const chatMessageSchema = {
  body: Joi.object({
    message: Joi.string().trim().allow('', null).optional(),
    toolCallName: Joi.string().trim().optional(),
    toolCallArgs: Joi.object().optional(),
  }).or('message', 'toolCallName'),
};

const confirmActionSchema = {
  body: Joi.object({
    confirmationToken: Joi.string().optional(),
    token: Joi.string().optional(),
  }).or('confirmationToken', 'token').messages({
    'object.missing': 'confirmationToken is required',
  }),
};

module.exports = {
  chatMessageSchema,
  confirmActionSchema,
};
