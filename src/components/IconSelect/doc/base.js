const { default: IconSelect, IconDisplay } = _IconSelect;
const { createWithRemoteLoader } = remoteLoader;

const Display = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { formData } = FormInfo.useFormContext();
  return <IconDisplay type={formData?.icon} />;
});

const BaseExample = createWithRemoteLoader({
  modules: ['components-core:FormInfo']
})(({ remoteModules }) => {
  const [FormInfo] = remoteModules;
  const { Form } = FormInfo;
  return (
    <Form>
      <Display />
      <IconSelect name="icon" label="Icon" />
    </Form>
  );
});

render(<BaseExample />);
