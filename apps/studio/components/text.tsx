export const TitleStyle = (props) => (
  <span style={{ fontFamily: "serif", fontSize: "2em" }}>{props.children}</span>
);

export const BodyStyle = (props) => (
  <span style={{ fontFamily: "sans-serif", fontSize: "1em", color: "red"}}>
    {props.children}
  </span>
);
