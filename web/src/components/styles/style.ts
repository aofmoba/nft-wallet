import styled from "styled-components";

import Button from "../../components/Button";
import Column from "../../components/Column";
import Wrapper from "../../components/Wrapper";
import Modal from "../../components/Modal";
import Header from "../../components/Header";
import Loader from "../../components/Loader";
import Banner from "../../components/Banner";
import { fonts } from "../../styles"; // fonts

const SLayout = styled.div`
  position: relative;
  width: 100%;
  /* height: 100%; */
  min-height: 100vh;
  text-align: center;
`;
const SContent = styled(Wrapper as any)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;
const SLanding = styled(Column as any)`
  height: 600px;
`;
const SButtonContainer = styled(Column as any)`
  width: 250px;
  margin: 50px 0;
`;
const SConnectButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  margin: 12px 0;
`;
const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;
const SModalContainer = styled.div`
  width: 100%;
  position: relative;
  word-wrap: break-word;
`;
const SModalTitle = styled.div`
  margin: 1em 0;
  font-size: 20px;
  font-weight: 700;
`;
const SModalParagraph = styled.p`
  margin-top: 30px;
`;
// @ts-ignore
const SBalances = styled(SLanding as any)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;
const STable = styled(SContainer as any)`
  flex-direction: column;
  text-align: left;
`;
const SRow = styled.div`
  width: 100%;
  display: flex;
  margin: 6px 0;
`;
const SKey = styled.div`
  width: 30%;
  font-weight: 700;
`;
const SValue = styled.div`
  width: 70%;
  font-family: monospace;
`;
const STestButtonContainer = styled.div`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
`;
const STestButton = styled(Button as any)`
  border-radius: 8px;
  font-size: ${fonts.size.medium};
  height: 44px;
  width: 100%;
  max-width: 175px;
  margin: 12px;
`;


export default {
    SLayout,
    SContent,
    SButtonContainer,
    SConnectButton,
    SModalContainer,
    SModalTitle,
    SModalParagraph,
    STable,
    SRow,
    SKey,
    SValue,
    STestButtonContainer,
    STestButton,
    SLanding,
    SContainer,
    SBalances,
    Modal,
    Header,
    Loader,
    Banner,
    Column
}