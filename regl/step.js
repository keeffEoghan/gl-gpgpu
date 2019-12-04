// Bindings for `regl` to use the step stuff.


const withContext = out.withContext = (f, context) => {
    cache.props = props;
    draw(withContext);
};

const withProps = out.withProps = (f, props) => {
    cache.props = props;
    draw(withContext);
};
