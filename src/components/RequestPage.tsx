import { useParams } from "react-router";
import useSWR from "swr";
import { type RequestEventClient } from "../models/request";
import { headerNameDisplay } from "../lib/utils";
import { Layout } from "./Layout";

export const RequestPage = () => {
  const { id } = useParams();
  const { data: request, isLoading } = useSWR<RequestEventClient>(
    `/requests/${id}`
  );
  const requestBody = atob(request?.request?.body ?? "");
  const responseBody = atob(request?.response?.body ?? "");
  return null;
  // return (
  //   <Layout openRequest={id}>
  //     {isLoading ? (
  //       <Spinner />
  //     ) : (
  //       <>
  //         <Section title="Request">
  //           <SectionCard>
  //             {request?.request?.method} {request?.request?.url}
  //           </SectionCard>
  //           <SectionCard>
  //             <HTMLTable compact striped>
  //               <tbody>
  //                 {Object.entries(request?.request?.headers ?? {}).map(
  //                   ([k, v]) => (
  //                     <tr>
  //                       <td>{headerNameDisplay(k)}</td>
  //                       <td>{v}</td>
  //                     </tr>
  //                   )
  //                 )}
  //               </tbody>
  //             </HTMLTable>
  //           </SectionCard>
  //           {requestBody ? (
  //             <SectionCard>
  //               <pre className="bp5-code-block">
  //                 <code>{requestBody}</code>
  //               </pre>
  //             </SectionCard>
  //           ) : null}
  //         </Section>
  //         <Section title="Response">
  //           <SectionCard>
  //             <HTMLTable compact striped>
  //               <tbody>
  //                 {Object.entries(request?.response?.headers ?? {}).map(
  //                   ([k, v]) => (
  //                     <tr>
  //                       <td>{headerNameDisplay(k)}</td>
  //                       <td>{v}</td>
  //                     </tr>
  //                   )
  //                 )}
  //               </tbody>
  //             </HTMLTable>
  //           </SectionCard>
  //           {responseBody ? (
  //             <SectionCard>
  //               <pre className="bp5-code-block">
  //                 <code>{responseBody}</code>
  //               </pre>
  //             </SectionCard>
  //           ) : null}
  //         </Section>
  //       </>
  //     )}
  //   </Layout>
  // );
};
