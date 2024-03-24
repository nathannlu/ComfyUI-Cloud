/**
 * Prepares a form given a schema
 */
import van from '../lib/van.js';

const { label, div, h2, form, p, button, input } = van.tags

export const generateForm = (schema, dialogInstance) => {
  const formState = {};

  // Initialize state for each field in the schema
  Object.keys(schema.fields).forEach(fieldName => {
    formState[fieldName] = van.state("");
  });

  const errorMessage = van.state("");

  const isLoading = van.state(false)

  const handleSubmit = async (event) => {
    event.preventDefault();

    isLoading.val = true;
    errorMessage.val = "";

    try {
      // Construct data object from form state
      const formData = {};
      Object.keys(schema.fields).forEach(fieldName => {
        formData[fieldName] = formState[fieldName].val;
      });

      await schema.onSubmit(formData, dialogInstance)

    } catch (error) {
      errorMessage.val = error.message;
    } finally {
      isLoading.val = false;
    }
  };

  return () => (
    div({ style: "width: 420px;" },
      h2({ style: "text-align: center;" }, schema.title),
      schema.description && p({ style: "color: white; text-align: center; margin-top: 20px;" }, schema.description),
      form({ 
        onsubmit: handleSubmit,
        style: "margin-top: 20px;"
      },
        Object.entries(schema.fields).map(([fieldName, field]) => (
          div({ style: 'margin-bottom: 16px;' },
            label({ htmlfor: fieldName, style: "display: block; margin-bottom: 10px;" }, field.label),
            input({
              type: field.type,
              name: fieldName,
              style: "width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 5px;",
              placeholder: field.placeholder,
              required: field.required,
              value: () => formState[fieldName].val,
              oninput: e => formState[fieldName].val = e.target.value
            })
          )
        )),

        isLoading.val ? 
          button({
            disabled: true,
            style: "width: 100%; padding: 10px; background-color: #1D4AFF; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;"
          }, "Loading") : 
          button({
            type: "submit",
            style: "width: 100%; padding: 10px; background-color: #1D4AFF; color: #fff; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;"
          }, schema.submitButtonText || "Submit"),

        p({ style: "color: red; text-align: center;" }, errorMessage.val)
      )
    )
  );
};
