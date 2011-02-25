/*
 * Sonar JavaScript Plugin
 * Copyright (C) 2011 Eriks Nukis
 * dev@sonar.codehaus.org
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

package org.sonar.plugins.javascript.cpd.antlr;

// $ANTLR 3.3 Nov 30, 2010 12:45:30 ES3.g3 2011-02-18 12:58:36

import org.antlr.runtime.*;
import java.util.Stack;
import java.util.List;
import java.util.ArrayList;


import org.antlr.runtime.tree.*;

public class ES3Parser extends Parser {
    public static final String[] tokenNames = new String[] {
        "<invalid>", "<EOR>", "<DOWN>", "<UP>", "NULL", "TRUE", "FALSE", "BREAK", "CASE", "CATCH", "CONTINUE", "DEFAULT", "DELETE", "DO", "ELSE", "FINALLY", "FOR", "FUNCTION", "IF", "IN", "INSTANCEOF", "NEW", "RETURN", "SWITCH", "THIS", "THROW", "TRY", "TYPEOF", "VAR", "VOID", "WHILE", "WITH", "ABSTRACT", "BOOLEAN", "BYTE", "CHAR", "CLASS", "CONST", "DEBUGGER", "DOUBLE", "ENUM", "EXPORT", "EXTENDS", "FINAL", "FLOAT", "GOTO", "IMPLEMENTS", "IMPORT", "INT", "INTERFACE", "LONG", "NATIVE", "PACKAGE", "PRIVATE", "PROTECTED", "PUBLIC", "SHORT", "STATIC", "SUPER", "SYNCHRONIZED", "THROWS", "TRANSIENT", "VOLATILE", "LBRACE", "RBRACE", "LPAREN", "RPAREN", "LBRACK", "RBRACK", "DOT", "SEMIC", "COMMA", "LT", "GT", "LTE", "GTE", "EQ", "NEQ", "SAME", "NSAME", "ADD", "SUB", "MUL", "MOD", "INC", "DEC", "SHL", "SHR", "SHU", "AND", "OR", "XOR", "NOT", "INV", "LAND", "LOR", "QUE", "COLON", "ASSIGN", "ADDASS", "SUBASS", "MULASS", "MODASS", "SHLASS", "SHRASS", "SHUASS", "ANDASS", "ORASS", "XORASS", "DIV", "DIVASS", "ARGS", "ARRAY", "BLOCK", "BYFIELD", "BYINDEX", "CALL", "CEXPR", "EXPR", "FORITER", "FORSTEP", "ITEM", "LABELLED", "NAMEDVALUE", "NEG", "OBJECT", "PAREXPR", "PDEC", "PINC", "POS", "BSLASH", "DQUOTE", "SQUOTE", "TAB", "VT", "FF", "SP", "NBSP", "USP", "WhiteSpace", "LF", "CR", "LS", "PS", "LineTerminator", "EOL", "MultiLineComment", "SingleLineComment", "Identifier", "StringLiteral", "HexDigit", "IdentifierStartASCII", "DecimalDigit", "IdentifierPart", "IdentifierNameASCIIStart", "RegularExpressionLiteral", "OctalDigit", "ExponentPart", "DecimalIntegerLiteral", "DecimalLiteral", "OctalIntegerLiteral", "HexIntegerLiteral", "CharacterEscapeSequence", "ZeroToThree", "OctalEscapeSequence", "HexEscapeSequence", "UnicodeEscapeSequence", "EscapeSequence", "BackslashSequence", "RegularExpressionFirstChar", "RegularExpressionChar"
    };
    public static final int EOF=-1;
    public static final int NULL=4;
    public static final int TRUE=5;
    public static final int FALSE=6;
    public static final int BREAK=7;
    public static final int CASE=8;
    public static final int CATCH=9;
    public static final int CONTINUE=10;
    public static final int DEFAULT=11;
    public static final int DELETE=12;
    public static final int DO=13;
    public static final int ELSE=14;
    public static final int FINALLY=15;
    public static final int FOR=16;
    public static final int FUNCTION=17;
    public static final int IF=18;
    public static final int IN=19;
    public static final int INSTANCEOF=20;
    public static final int NEW=21;
    public static final int RETURN=22;
    public static final int SWITCH=23;
    public static final int THIS=24;
    public static final int THROW=25;
    public static final int TRY=26;
    public static final int TYPEOF=27;
    public static final int VAR=28;
    public static final int VOID=29;
    public static final int WHILE=30;
    public static final int WITH=31;
    public static final int ABSTRACT=32;
    public static final int BOOLEAN=33;
    public static final int BYTE=34;
    public static final int CHAR=35;
    public static final int CLASS=36;
    public static final int CONST=37;
    public static final int DEBUGGER=38;
    public static final int DOUBLE=39;
    public static final int ENUM=40;
    public static final int EXPORT=41;
    public static final int EXTENDS=42;
    public static final int FINAL=43;
    public static final int FLOAT=44;
    public static final int GOTO=45;
    public static final int IMPLEMENTS=46;
    public static final int IMPORT=47;
    public static final int INT=48;
    public static final int INTERFACE=49;
    public static final int LONG=50;
    public static final int NATIVE=51;
    public static final int PACKAGE=52;
    public static final int PRIVATE=53;
    public static final int PROTECTED=54;
    public static final int PUBLIC=55;
    public static final int SHORT=56;
    public static final int STATIC=57;
    public static final int SUPER=58;
    public static final int SYNCHRONIZED=59;
    public static final int THROWS=60;
    public static final int TRANSIENT=61;
    public static final int VOLATILE=62;
    public static final int LBRACE=63;
    public static final int RBRACE=64;
    public static final int LPAREN=65;
    public static final int RPAREN=66;
    public static final int LBRACK=67;
    public static final int RBRACK=68;
    public static final int DOT=69;
    public static final int SEMIC=70;
    public static final int COMMA=71;
    public static final int LT=72;
    public static final int GT=73;
    public static final int LTE=74;
    public static final int GTE=75;
    public static final int EQ=76;
    public static final int NEQ=77;
    public static final int SAME=78;
    public static final int NSAME=79;
    public static final int ADD=80;
    public static final int SUB=81;
    public static final int MUL=82;
    public static final int MOD=83;
    public static final int INC=84;
    public static final int DEC=85;
    public static final int SHL=86;
    public static final int SHR=87;
    public static final int SHU=88;
    public static final int AND=89;
    public static final int OR=90;
    public static final int XOR=91;
    public static final int NOT=92;
    public static final int INV=93;
    public static final int LAND=94;
    public static final int LOR=95;
    public static final int QUE=96;
    public static final int COLON=97;
    public static final int ASSIGN=98;
    public static final int ADDASS=99;
    public static final int SUBASS=100;
    public static final int MULASS=101;
    public static final int MODASS=102;
    public static final int SHLASS=103;
    public static final int SHRASS=104;
    public static final int SHUASS=105;
    public static final int ANDASS=106;
    public static final int ORASS=107;
    public static final int XORASS=108;
    public static final int DIV=109;
    public static final int DIVASS=110;
    public static final int ARGS=111;
    public static final int ARRAY=112;
    public static final int BLOCK=113;
    public static final int BYFIELD=114;
    public static final int BYINDEX=115;
    public static final int CALL=116;
    public static final int CEXPR=117;
    public static final int EXPR=118;
    public static final int FORITER=119;
    public static final int FORSTEP=120;
    public static final int ITEM=121;
    public static final int LABELLED=122;
    public static final int NAMEDVALUE=123;
    public static final int NEG=124;
    public static final int OBJECT=125;
    public static final int PAREXPR=126;
    public static final int PDEC=127;
    public static final int PINC=128;
    public static final int POS=129;
    public static final int BSLASH=130;
    public static final int DQUOTE=131;
    public static final int SQUOTE=132;
    public static final int TAB=133;
    public static final int VT=134;
    public static final int FF=135;
    public static final int SP=136;
    public static final int NBSP=137;
    public static final int USP=138;
    public static final int WhiteSpace=139;
    public static final int LF=140;
    public static final int CR=141;
    public static final int LS=142;
    public static final int PS=143;
    public static final int LineTerminator=144;
    public static final int EOL=145;
    public static final int MultiLineComment=146;
    public static final int SingleLineComment=147;
    public static final int Identifier=148;
    public static final int StringLiteral=149;
    public static final int HexDigit=150;
    public static final int IdentifierStartASCII=151;
    public static final int DecimalDigit=152;
    public static final int IdentifierPart=153;
    public static final int IdentifierNameASCIIStart=154;
    public static final int RegularExpressionLiteral=155;
    public static final int OctalDigit=156;
    public static final int ExponentPart=157;
    public static final int DecimalIntegerLiteral=158;
    public static final int DecimalLiteral=159;
    public static final int OctalIntegerLiteral=160;
    public static final int HexIntegerLiteral=161;
    public static final int CharacterEscapeSequence=162;
    public static final int ZeroToThree=163;
    public static final int OctalEscapeSequence=164;
    public static final int HexEscapeSequence=165;
    public static final int UnicodeEscapeSequence=166;
    public static final int EscapeSequence=167;
    public static final int BackslashSequence=168;
    public static final int RegularExpressionFirstChar=169;
    public static final int RegularExpressionChar=170;

    // delegates
    // delegators


        public ES3Parser(TokenStream input) {
            this(input, new RecognizerSharedState());
        }
        public ES3Parser(TokenStream input, RecognizerSharedState state) {
            super(input, state);
             
        }
        
    protected TreeAdaptor adaptor = new CommonTreeAdaptor();

    public void setTreeAdaptor(TreeAdaptor adaptor) {
        this.adaptor = adaptor;
    }
    public TreeAdaptor getTreeAdaptor() {
        return adaptor;
    }

    public String[] getTokenNames() { return ES3Parser.tokenNames; }
    public String getGrammarFileName() { return "ES3.g3"; }


    private final boolean isLeftHandSideAssign(RuleReturnScope lhs, Object[] cached)
    {
    	if (cached[0] != null)
    	{
    		return ((Boolean)cached[0]).booleanValue();
    	}
    	
    	boolean result;
    	if (isLeftHandSideExpression(lhs))
    	{
    		switch (input.LA(1))
    		{
    			case ASSIGN:
    			case MULASS:
    			case DIVASS:
    			case MODASS:
    			case ADDASS:
    			case SUBASS:
    			case SHLASS:
    			case SHRASS:
    			case SHUASS:
    			case ANDASS:
    			case XORASS:
    			case ORASS:
    				result = true;
    				break;
    			default:
    				result = false;
    				break;
    		}
    	}
    	else
    	{
    		result = false;
    	}
    	
    	cached[0] = new Boolean(result);
    	return result;
    }

    private final static boolean isLeftHandSideExpression(RuleReturnScope lhs)
    {
    	if (lhs.getTree() == null) // e.g. during backtracking
    	{
    		return true;
    	}
    	else
    	{
    		switch (((Tree)lhs.getTree()).getType())
    		{
    		// primaryExpression
    			case THIS:
    			case Identifier:
    			case NULL:
    			case TRUE:
    			case FALSE:
    			case DecimalLiteral:
    			case OctalIntegerLiteral:
    			case HexIntegerLiteral:
    			case StringLiteral:
    			case RegularExpressionLiteral:
    			case ARRAY:
    			case OBJECT:
    			case PAREXPR:
    		// functionExpression
    			case FUNCTION:
    		// newExpression
    			case NEW:
    		// leftHandSideExpression
    			case CALL:
    			case BYFIELD:
    			case BYINDEX:
    				return true;
    			
    			default:
    				return false;
    		}
    	}
    }
    	
    private final boolean isLeftHandSideIn(RuleReturnScope lhs, Object[] cached)
    {
    	if (cached[0] != null)
    	{
    		return ((Boolean)cached[0]).booleanValue();
    	}
    	
    	boolean result = isLeftHandSideExpression(lhs) && (input.LA(1) == IN);
    	cached[0] = new Boolean(result);
    	return result;
    }

    private final void promoteEOL(ParserRuleReturnScope rule)
    {
    	// Get current token and its type (the possibly offending token).
    	Token lt = input.LT(1);
    	int la = lt.getType();
    	
    	// We only need to promote an EOL when the current token is offending (not a SEMIC, EOF, RBRACE, EOL or MultiLineComment).
    	// EOL and MultiLineComment are not offending as they're already promoted in a previous call to this method.
    	// Promoting an EOL means switching it from off channel to on channel.
    	// A MultiLineComment gets promoted when it contains an EOL.
    	if (!(la == SEMIC || la == EOF || la == RBRACE || la == EOL || la == MultiLineComment))
    	{
    		// Start on the possition before the current token and scan backwards off channel tokens until the previous on channel token.
    		for (int ix = lt.getTokenIndex() - 1; ix > 0; ix--)
    		{
    			lt = input.get(ix);
    			if (lt.getChannel() == Token.DEFAULT_CHANNEL)
    			{
    				// On channel token found: stop scanning.
    				break;
    			}
    			else if (lt.getType() == EOL || (lt.getType() == MultiLineComment && lt.getText().matches("/.*\r\n|\r|\n")))
    			{
    				// We found our EOL: promote the token to on channel, position the input on it and reset the rule start.
    				lt.setChannel(Token.DEFAULT_CHANNEL);
    				input.seek(lt.getTokenIndex());
    				if (rule != null)
    				{
    					rule.start = lt;
    				}
    				break;
    			}
    		}
    	}
    }	


    public static class token_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "token"
    // ES3.g3:506:1: token : ( reservedWord | Identifier | punctuator | numericLiteral | StringLiteral );
    public final ES3Parser.token_return token() throws RecognitionException {
        ES3Parser.token_return retval = new ES3Parser.token_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token Identifier2=null;
        Token StringLiteral5=null;
        ES3Parser.reservedWord_return reservedWord1 = null;

        ES3Parser.punctuator_return punctuator3 = null;

        ES3Parser.numericLiteral_return numericLiteral4 = null;


        Object Identifier2_tree=null;
        Object StringLiteral5_tree=null;

        try {
            // ES3.g3:507:2: ( reservedWord | Identifier | punctuator | numericLiteral | StringLiteral )
            int alt1=5;
            switch ( input.LA(1) ) {
            case NULL:
            case TRUE:
            case FALSE:
            case BREAK:
            case CASE:
            case CATCH:
            case CONTINUE:
            case DEFAULT:
            case DELETE:
            case DO:
            case ELSE:
            case FINALLY:
            case FOR:
            case FUNCTION:
            case IF:
            case IN:
            case INSTANCEOF:
            case NEW:
            case RETURN:
            case SWITCH:
            case THIS:
            case THROW:
            case TRY:
            case TYPEOF:
            case VAR:
            case VOID:
            case WHILE:
            case WITH:
            case ABSTRACT:
            case BOOLEAN:
            case BYTE:
            case CHAR:
            case CLASS:
            case CONST:
            case DEBUGGER:
            case DOUBLE:
            case ENUM:
            case EXPORT:
            case EXTENDS:
            case FINAL:
            case FLOAT:
            case GOTO:
            case IMPLEMENTS:
            case IMPORT:
            case INT:
            case INTERFACE:
            case LONG:
            case NATIVE:
            case PACKAGE:
            case PRIVATE:
            case PROTECTED:
            case PUBLIC:
            case SHORT:
            case STATIC:
            case SUPER:
            case SYNCHRONIZED:
            case THROWS:
            case TRANSIENT:
            case VOLATILE:
                {
                alt1=1;
                }
                break;
            case Identifier:
                {
                alt1=2;
                }
                break;
            case LBRACE:
            case RBRACE:
            case LPAREN:
            case RPAREN:
            case LBRACK:
            case RBRACK:
            case DOT:
            case SEMIC:
            case COMMA:
            case LT:
            case GT:
            case LTE:
            case GTE:
            case EQ:
            case NEQ:
            case SAME:
            case NSAME:
            case ADD:
            case SUB:
            case MUL:
            case MOD:
            case INC:
            case DEC:
            case SHL:
            case SHR:
            case SHU:
            case AND:
            case OR:
            case XOR:
            case NOT:
            case INV:
            case LAND:
            case LOR:
            case QUE:
            case COLON:
            case ASSIGN:
            case ADDASS:
            case SUBASS:
            case MULASS:
            case MODASS:
            case SHLASS:
            case SHRASS:
            case SHUASS:
            case ANDASS:
            case ORASS:
            case XORASS:
            case DIV:
            case DIVASS:
                {
                alt1=3;
                }
                break;
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt1=4;
                }
                break;
            case StringLiteral:
                {
                alt1=5;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 1, 0, input);

                throw nvae;
            }

            switch (alt1) {
                case 1 :
                    // ES3.g3:507:4: reservedWord
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_reservedWord_in_token1735);
                    reservedWord1=reservedWord();

                    state._fsp--;

                    adaptor.addChild(root_0, reservedWord1.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:508:4: Identifier
                    {
                    root_0 = (Object)adaptor.nil();

                    Identifier2=(Token)match(input,Identifier,FOLLOW_Identifier_in_token1740); 
                    Identifier2_tree = (Object)adaptor.create(Identifier2);
                    adaptor.addChild(root_0, Identifier2_tree);


                    }
                    break;
                case 3 :
                    // ES3.g3:509:4: punctuator
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_punctuator_in_token1745);
                    punctuator3=punctuator();

                    state._fsp--;

                    adaptor.addChild(root_0, punctuator3.getTree());

                    }
                    break;
                case 4 :
                    // ES3.g3:510:4: numericLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_numericLiteral_in_token1750);
                    numericLiteral4=numericLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, numericLiteral4.getTree());

                    }
                    break;
                case 5 :
                    // ES3.g3:511:4: StringLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    StringLiteral5=(Token)match(input,StringLiteral,FOLLOW_StringLiteral_in_token1755); 
                    StringLiteral5_tree = (Object)adaptor.create(StringLiteral5);
                    adaptor.addChild(root_0, StringLiteral5_tree);


                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "token"

    public static class reservedWord_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "reservedWord"
    // ES3.g3:516:1: reservedWord : ( keyword | futureReservedWord | NULL | booleanLiteral );
    public final ES3Parser.reservedWord_return reservedWord() throws RecognitionException {
        ES3Parser.reservedWord_return retval = new ES3Parser.reservedWord_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token NULL8=null;
        ES3Parser.keyword_return keyword6 = null;

        ES3Parser.futureReservedWord_return futureReservedWord7 = null;

        ES3Parser.booleanLiteral_return booleanLiteral9 = null;


        Object NULL8_tree=null;

        try {
            // ES3.g3:517:2: ( keyword | futureReservedWord | NULL | booleanLiteral )
            int alt2=4;
            switch ( input.LA(1) ) {
            case BREAK:
            case CASE:
            case CATCH:
            case CONTINUE:
            case DEFAULT:
            case DELETE:
            case DO:
            case ELSE:
            case FINALLY:
            case FOR:
            case FUNCTION:
            case IF:
            case IN:
            case INSTANCEOF:
            case NEW:
            case RETURN:
            case SWITCH:
            case THIS:
            case THROW:
            case TRY:
            case TYPEOF:
            case VAR:
            case VOID:
            case WHILE:
            case WITH:
                {
                alt2=1;
                }
                break;
            case ABSTRACT:
            case BOOLEAN:
            case BYTE:
            case CHAR:
            case CLASS:
            case CONST:
            case DEBUGGER:
            case DOUBLE:
            case ENUM:
            case EXPORT:
            case EXTENDS:
            case FINAL:
            case FLOAT:
            case GOTO:
            case IMPLEMENTS:
            case IMPORT:
            case INT:
            case INTERFACE:
            case LONG:
            case NATIVE:
            case PACKAGE:
            case PRIVATE:
            case PROTECTED:
            case PUBLIC:
            case SHORT:
            case STATIC:
            case SUPER:
            case SYNCHRONIZED:
            case THROWS:
            case TRANSIENT:
            case VOLATILE:
                {
                alt2=2;
                }
                break;
            case NULL:
                {
                alt2=3;
                }
                break;
            case TRUE:
            case FALSE:
                {
                alt2=4;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 2, 0, input);

                throw nvae;
            }

            switch (alt2) {
                case 1 :
                    // ES3.g3:517:4: keyword
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_keyword_in_reservedWord1768);
                    keyword6=keyword();

                    state._fsp--;

                    adaptor.addChild(root_0, keyword6.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:518:4: futureReservedWord
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_futureReservedWord_in_reservedWord1773);
                    futureReservedWord7=futureReservedWord();

                    state._fsp--;

                    adaptor.addChild(root_0, futureReservedWord7.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:519:4: NULL
                    {
                    root_0 = (Object)adaptor.nil();

                    NULL8=(Token)match(input,NULL,FOLLOW_NULL_in_reservedWord1778); 
                    NULL8_tree = (Object)adaptor.create(NULL8);
                    adaptor.addChild(root_0, NULL8_tree);


                    }
                    break;
                case 4 :
                    // ES3.g3:520:4: booleanLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_booleanLiteral_in_reservedWord1783);
                    booleanLiteral9=booleanLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, booleanLiteral9.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "reservedWord"

    public static class keyword_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "keyword"
    // ES3.g3:527:1: keyword : ( BREAK | CASE | CATCH | CONTINUE | DEFAULT | DELETE | DO | ELSE | FINALLY | FOR | FUNCTION | IF | IN | INSTANCEOF | NEW | RETURN | SWITCH | THIS | THROW | TRY | TYPEOF | VAR | VOID | WHILE | WITH );
    public final ES3Parser.keyword_return keyword() throws RecognitionException {
        ES3Parser.keyword_return retval = new ES3Parser.keyword_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set10=null;

        Object set10_tree=null;

        try {
            // ES3.g3:528:2: ( BREAK | CASE | CATCH | CONTINUE | DEFAULT | DELETE | DO | ELSE | FINALLY | FOR | FUNCTION | IF | IN | INSTANCEOF | NEW | RETURN | SWITCH | THIS | THROW | TRY | TYPEOF | VAR | VOID | WHILE | WITH )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set10=(Token)input.LT(1);
            if ( (input.LA(1)>=BREAK && input.LA(1)<=WITH) ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set10));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "keyword"

    public static class futureReservedWord_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "futureReservedWord"
    // ES3.g3:559:1: futureReservedWord : ( ABSTRACT | BOOLEAN | BYTE | CHAR | CLASS | CONST | DEBUGGER | DOUBLE | ENUM | EXPORT | EXTENDS | FINAL | FLOAT | GOTO | IMPLEMENTS | IMPORT | INT | INTERFACE | LONG | NATIVE | PACKAGE | PRIVATE | PROTECTED | PUBLIC | SHORT | STATIC | SUPER | SYNCHRONIZED | THROWS | TRANSIENT | VOLATILE );
    public final ES3Parser.futureReservedWord_return futureReservedWord() throws RecognitionException {
        ES3Parser.futureReservedWord_return retval = new ES3Parser.futureReservedWord_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set11=null;

        Object set11_tree=null;

        try {
            // ES3.g3:560:2: ( ABSTRACT | BOOLEAN | BYTE | CHAR | CLASS | CONST | DEBUGGER | DOUBLE | ENUM | EXPORT | EXTENDS | FINAL | FLOAT | GOTO | IMPLEMENTS | IMPORT | INT | INTERFACE | LONG | NATIVE | PACKAGE | PRIVATE | PROTECTED | PUBLIC | SHORT | STATIC | SUPER | SYNCHRONIZED | THROWS | TRANSIENT | VOLATILE )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set11=(Token)input.LT(1);
            if ( (input.LA(1)>=ABSTRACT && input.LA(1)<=VOLATILE) ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set11));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "futureReservedWord"

    public static class punctuator_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "punctuator"
    // ES3.g3:637:1: punctuator : ( LBRACE | RBRACE | LPAREN | RPAREN | LBRACK | RBRACK | DOT | SEMIC | COMMA | LT | GT | LTE | GTE | EQ | NEQ | SAME | NSAME | ADD | SUB | MUL | MOD | INC | DEC | SHL | SHR | SHU | AND | OR | XOR | NOT | INV | LAND | LOR | QUE | COLON | ASSIGN | ADDASS | SUBASS | MULASS | MODASS | SHLASS | SHRASS | SHUASS | ANDASS | ORASS | XORASS | DIV | DIVASS );
    public final ES3Parser.punctuator_return punctuator() throws RecognitionException {
        ES3Parser.punctuator_return retval = new ES3Parser.punctuator_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set12=null;

        Object set12_tree=null;

        try {
            // ES3.g3:638:2: ( LBRACE | RBRACE | LPAREN | RPAREN | LBRACK | RBRACK | DOT | SEMIC | COMMA | LT | GT | LTE | GTE | EQ | NEQ | SAME | NSAME | ADD | SUB | MUL | MOD | INC | DEC | SHL | SHR | SHU | AND | OR | XOR | NOT | INV | LAND | LOR | QUE | COLON | ASSIGN | ADDASS | SUBASS | MULASS | MODASS | SHLASS | SHRASS | SHUASS | ANDASS | ORASS | XORASS | DIV | DIVASS )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set12=(Token)input.LT(1);
            if ( (input.LA(1)>=LBRACE && input.LA(1)<=DIVASS) ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set12));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "punctuator"

    public static class literal_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "literal"
    // ES3.g3:692:1: literal : ( NULL | booleanLiteral | numericLiteral | StringLiteral | RegularExpressionLiteral );
    public final ES3Parser.literal_return literal() throws RecognitionException {
        ES3Parser.literal_return retval = new ES3Parser.literal_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token NULL13=null;
        Token StringLiteral16=null;
        Token RegularExpressionLiteral17=null;
        ES3Parser.booleanLiteral_return booleanLiteral14 = null;

        ES3Parser.numericLiteral_return numericLiteral15 = null;


        Object NULL13_tree=null;
        Object StringLiteral16_tree=null;
        Object RegularExpressionLiteral17_tree=null;

        try {
            // ES3.g3:693:2: ( NULL | booleanLiteral | numericLiteral | StringLiteral | RegularExpressionLiteral )
            int alt3=5;
            switch ( input.LA(1) ) {
            case NULL:
                {
                alt3=1;
                }
                break;
            case TRUE:
            case FALSE:
                {
                alt3=2;
                }
                break;
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt3=3;
                }
                break;
            case StringLiteral:
                {
                alt3=4;
                }
                break;
            case RegularExpressionLiteral:
                {
                alt3=5;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 3, 0, input);

                throw nvae;
            }

            switch (alt3) {
                case 1 :
                    // ES3.g3:693:4: NULL
                    {
                    root_0 = (Object)adaptor.nil();

                    NULL13=(Token)match(input,NULL,FOLLOW_NULL_in_literal2464); 
                    NULL13_tree = (Object)adaptor.create(NULL13);
                    adaptor.addChild(root_0, NULL13_tree);


                    }
                    break;
                case 2 :
                    // ES3.g3:694:4: booleanLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_booleanLiteral_in_literal2469);
                    booleanLiteral14=booleanLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, booleanLiteral14.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:695:4: numericLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_numericLiteral_in_literal2474);
                    numericLiteral15=numericLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, numericLiteral15.getTree());

                    }
                    break;
                case 4 :
                    // ES3.g3:696:4: StringLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    StringLiteral16=(Token)match(input,StringLiteral,FOLLOW_StringLiteral_in_literal2479); 
                    StringLiteral16_tree = (Object)adaptor.create(StringLiteral16);
                    adaptor.addChild(root_0, StringLiteral16_tree);


                    }
                    break;
                case 5 :
                    // ES3.g3:697:4: RegularExpressionLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    RegularExpressionLiteral17=(Token)match(input,RegularExpressionLiteral,FOLLOW_RegularExpressionLiteral_in_literal2484); 
                    RegularExpressionLiteral17_tree = (Object)adaptor.create(RegularExpressionLiteral17);
                    adaptor.addChild(root_0, RegularExpressionLiteral17_tree);


                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "literal"

    public static class booleanLiteral_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "booleanLiteral"
    // ES3.g3:700:1: booleanLiteral : ( TRUE | FALSE );
    public final ES3Parser.booleanLiteral_return booleanLiteral() throws RecognitionException {
        ES3Parser.booleanLiteral_return retval = new ES3Parser.booleanLiteral_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set18=null;

        Object set18_tree=null;

        try {
            // ES3.g3:701:2: ( TRUE | FALSE )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set18=(Token)input.LT(1);
            if ( (input.LA(1)>=TRUE && input.LA(1)<=FALSE) ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set18));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "booleanLiteral"

    public static class numericLiteral_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "numericLiteral"
    // ES3.g3:747:1: numericLiteral : ( DecimalLiteral | OctalIntegerLiteral | HexIntegerLiteral );
    public final ES3Parser.numericLiteral_return numericLiteral() throws RecognitionException {
        ES3Parser.numericLiteral_return retval = new ES3Parser.numericLiteral_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set19=null;

        Object set19_tree=null;

        try {
            // ES3.g3:748:2: ( DecimalLiteral | OctalIntegerLiteral | HexIntegerLiteral )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set19=(Token)input.LT(1);
            if ( (input.LA(1)>=DecimalLiteral && input.LA(1)<=HexIntegerLiteral) ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set19));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "numericLiteral"

    public static class primaryExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "primaryExpression"
    // ES3.g3:835:1: primaryExpression : ( THIS | Identifier | literal | arrayLiteral | objectLiteral | lpar= LPAREN expression RPAREN -> ^( PAREXPR[$lpar, \"PAREXPR\"] expression ) );
    public final ES3Parser.primaryExpression_return primaryExpression() throws RecognitionException {
        ES3Parser.primaryExpression_return retval = new ES3Parser.primaryExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token lpar=null;
        Token THIS20=null;
        Token Identifier21=null;
        Token RPAREN26=null;
        ES3Parser.literal_return literal22 = null;

        ES3Parser.arrayLiteral_return arrayLiteral23 = null;

        ES3Parser.objectLiteral_return objectLiteral24 = null;

        ES3Parser.expression_return expression25 = null;


        Object lpar_tree=null;
        Object THIS20_tree=null;
        Object Identifier21_tree=null;
        Object RPAREN26_tree=null;
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        try {
            // ES3.g3:836:2: ( THIS | Identifier | literal | arrayLiteral | objectLiteral | lpar= LPAREN expression RPAREN -> ^( PAREXPR[$lpar, \"PAREXPR\"] expression ) )
            int alt4=6;
            switch ( input.LA(1) ) {
            case THIS:
                {
                alt4=1;
                }
                break;
            case Identifier:
                {
                alt4=2;
                }
                break;
            case NULL:
            case TRUE:
            case FALSE:
            case StringLiteral:
            case RegularExpressionLiteral:
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt4=3;
                }
                break;
            case LBRACK:
                {
                alt4=4;
                }
                break;
            case LBRACE:
                {
                alt4=5;
                }
                break;
            case LPAREN:
                {
                alt4=6;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 4, 0, input);

                throw nvae;
            }

            switch (alt4) {
                case 1 :
                    // ES3.g3:836:4: THIS
                    {
                    root_0 = (Object)adaptor.nil();

                    THIS20=(Token)match(input,THIS,FOLLOW_THIS_in_primaryExpression3097); 
                    THIS20_tree = (Object)adaptor.create(THIS20);
                    adaptor.addChild(root_0, THIS20_tree);


                    }
                    break;
                case 2 :
                    // ES3.g3:837:4: Identifier
                    {
                    root_0 = (Object)adaptor.nil();

                    Identifier21=(Token)match(input,Identifier,FOLLOW_Identifier_in_primaryExpression3102); 
                    Identifier21_tree = (Object)adaptor.create(Identifier21);
                    adaptor.addChild(root_0, Identifier21_tree);


                    }
                    break;
                case 3 :
                    // ES3.g3:838:4: literal
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_literal_in_primaryExpression3107);
                    literal22=literal();

                    state._fsp--;

                    adaptor.addChild(root_0, literal22.getTree());

                    }
                    break;
                case 4 :
                    // ES3.g3:839:4: arrayLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_arrayLiteral_in_primaryExpression3112);
                    arrayLiteral23=arrayLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, arrayLiteral23.getTree());

                    }
                    break;
                case 5 :
                    // ES3.g3:840:4: objectLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_objectLiteral_in_primaryExpression3117);
                    objectLiteral24=objectLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, objectLiteral24.getTree());

                    }
                    break;
                case 6 :
                    // ES3.g3:841:4: lpar= LPAREN expression RPAREN
                    {
                    lpar=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_primaryExpression3124);  
                    stream_LPAREN.add(lpar);

                    pushFollow(FOLLOW_expression_in_primaryExpression3126);
                    expression25=expression();

                    state._fsp--;

                    stream_expression.add(expression25.getTree());
                    RPAREN26=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_primaryExpression3128);  
                    stream_RPAREN.add(RPAREN26);



                    // AST REWRITE
                    // elements: expression
                    // token labels: 
                    // rule labels: retval
                    // token list labels: 
                    // rule list labels: 
                    // wildcard labels: 
                    retval.tree = root_0;
                    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

                    root_0 = (Object)adaptor.nil();
                    // 841:34: -> ^( PAREXPR[$lpar, \"PAREXPR\"] expression )
                    {
                        // ES3.g3:841:37: ^( PAREXPR[$lpar, \"PAREXPR\"] expression )
                        {
                        Object root_1 = (Object)adaptor.nil();
                        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(PAREXPR, lpar, "PAREXPR"), root_1);

                        adaptor.addChild(root_1, stream_expression.nextTree());

                        adaptor.addChild(root_0, root_1);
                        }

                    }

                    retval.tree = root_0;
                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "primaryExpression"

    public static class arrayLiteral_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "arrayLiteral"
    // ES3.g3:844:1: arrayLiteral : lb= LBRACK ( arrayItem ( COMMA arrayItem )* )? RBRACK -> ^( ARRAY[$lb, \"ARRAY\"] ( arrayItem )* ) ;
    public final ES3Parser.arrayLiteral_return arrayLiteral() throws RecognitionException {
        ES3Parser.arrayLiteral_return retval = new ES3Parser.arrayLiteral_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token lb=null;
        Token COMMA28=null;
        Token RBRACK30=null;
        ES3Parser.arrayItem_return arrayItem27 = null;

        ES3Parser.arrayItem_return arrayItem29 = null;


        Object lb_tree=null;
        Object COMMA28_tree=null;
        Object RBRACK30_tree=null;
        RewriteRuleTokenStream stream_RBRACK=new RewriteRuleTokenStream(adaptor,"token RBRACK");
        RewriteRuleTokenStream stream_LBRACK=new RewriteRuleTokenStream(adaptor,"token LBRACK");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleSubtreeStream stream_arrayItem=new RewriteRuleSubtreeStream(adaptor,"rule arrayItem");
        try {
            // ES3.g3:845:2: (lb= LBRACK ( arrayItem ( COMMA arrayItem )* )? RBRACK -> ^( ARRAY[$lb, \"ARRAY\"] ( arrayItem )* ) )
            // ES3.g3:845:4: lb= LBRACK ( arrayItem ( COMMA arrayItem )* )? RBRACK
            {
            lb=(Token)match(input,LBRACK,FOLLOW_LBRACK_in_arrayLiteral3152);  
            stream_LBRACK.add(lb);

            // ES3.g3:845:14: ( arrayItem ( COMMA arrayItem )* )?
            int alt6=2;
            int LA6_0 = input.LA(1);

            if ( ((LA6_0>=NULL && LA6_0<=FALSE)||LA6_0==DELETE||LA6_0==FUNCTION||LA6_0==NEW||LA6_0==THIS||LA6_0==TYPEOF||LA6_0==VOID||LA6_0==LBRACE||LA6_0==LPAREN||LA6_0==LBRACK||LA6_0==COMMA||(LA6_0>=ADD && LA6_0<=SUB)||(LA6_0>=INC && LA6_0<=DEC)||(LA6_0>=NOT && LA6_0<=INV)||(LA6_0>=Identifier && LA6_0<=StringLiteral)||LA6_0==RegularExpressionLiteral||(LA6_0>=DecimalLiteral && LA6_0<=HexIntegerLiteral)) ) {
                alt6=1;
            }
            else if ( (LA6_0==RBRACK) ) {
                int LA6_2 = input.LA(2);

                if ( (( input.LA(1) == COMMA )) ) {
                    alt6=1;
                }
            }
            switch (alt6) {
                case 1 :
                    // ES3.g3:845:16: arrayItem ( COMMA arrayItem )*
                    {
                    pushFollow(FOLLOW_arrayItem_in_arrayLiteral3156);
                    arrayItem27=arrayItem();

                    state._fsp--;

                    stream_arrayItem.add(arrayItem27.getTree());
                    // ES3.g3:845:26: ( COMMA arrayItem )*
                    loop5:
                    do {
                        int alt5=2;
                        int LA5_0 = input.LA(1);

                        if ( (LA5_0==COMMA) ) {
                            alt5=1;
                        }


                        switch (alt5) {
                    	case 1 :
                    	    // ES3.g3:845:28: COMMA arrayItem
                    	    {
                    	    COMMA28=(Token)match(input,COMMA,FOLLOW_COMMA_in_arrayLiteral3160);  
                    	    stream_COMMA.add(COMMA28);

                    	    pushFollow(FOLLOW_arrayItem_in_arrayLiteral3162);
                    	    arrayItem29=arrayItem();

                    	    state._fsp--;

                    	    stream_arrayItem.add(arrayItem29.getTree());

                    	    }
                    	    break;

                    	default :
                    	    break loop5;
                        }
                    } while (true);


                    }
                    break;

            }

            RBRACK30=(Token)match(input,RBRACK,FOLLOW_RBRACK_in_arrayLiteral3170);  
            stream_RBRACK.add(RBRACK30);



            // AST REWRITE
            // elements: arrayItem
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 846:2: -> ^( ARRAY[$lb, \"ARRAY\"] ( arrayItem )* )
            {
                // ES3.g3:846:5: ^( ARRAY[$lb, \"ARRAY\"] ( arrayItem )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(ARRAY, lb, "ARRAY"), root_1);

                // ES3.g3:846:28: ( arrayItem )*
                while ( stream_arrayItem.hasNext() ) {
                    adaptor.addChild(root_1, stream_arrayItem.nextTree());

                }
                stream_arrayItem.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "arrayLiteral"

    public static class arrayItem_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "arrayItem"
    // ES3.g3:849:1: arrayItem : (expr= assignmentExpression | {...}?) -> ^( ITEM ( $expr)? ) ;
    public final ES3Parser.arrayItem_return arrayItem() throws RecognitionException {
        ES3Parser.arrayItem_return retval = new ES3Parser.arrayItem_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.assignmentExpression_return expr = null;


        RewriteRuleSubtreeStream stream_assignmentExpression=new RewriteRuleSubtreeStream(adaptor,"rule assignmentExpression");
        try {
            // ES3.g3:850:2: ( (expr= assignmentExpression | {...}?) -> ^( ITEM ( $expr)? ) )
            // ES3.g3:850:4: (expr= assignmentExpression | {...}?)
            {
            // ES3.g3:850:4: (expr= assignmentExpression | {...}?)
            int alt7=2;
            int LA7_0 = input.LA(1);

            if ( ((LA7_0>=NULL && LA7_0<=FALSE)||LA7_0==DELETE||LA7_0==FUNCTION||LA7_0==NEW||LA7_0==THIS||LA7_0==TYPEOF||LA7_0==VOID||LA7_0==LBRACE||LA7_0==LPAREN||LA7_0==LBRACK||(LA7_0>=ADD && LA7_0<=SUB)||(LA7_0>=INC && LA7_0<=DEC)||(LA7_0>=NOT && LA7_0<=INV)||(LA7_0>=Identifier && LA7_0<=StringLiteral)||LA7_0==RegularExpressionLiteral||(LA7_0>=DecimalLiteral && LA7_0<=HexIntegerLiteral)) ) {
                alt7=1;
            }
            else if ( (LA7_0==RBRACK||LA7_0==COMMA) ) {
                alt7=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 7, 0, input);

                throw nvae;
            }
            switch (alt7) {
                case 1 :
                    // ES3.g3:850:6: expr= assignmentExpression
                    {
                    pushFollow(FOLLOW_assignmentExpression_in_arrayItem3198);
                    expr=assignmentExpression();

                    state._fsp--;

                    stream_assignmentExpression.add(expr.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:850:34: {...}?
                    {
                    if ( !(( input.LA(1) == COMMA )) ) {
                        throw new FailedPredicateException(input, "arrayItem", " input.LA(1) == COMMA ");
                    }

                    }
                    break;

            }



            // AST REWRITE
            // elements: expr
            // token labels: 
            // rule labels: retval, expr
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
            RewriteRuleSubtreeStream stream_expr=new RewriteRuleSubtreeStream(adaptor,"rule expr",expr!=null?expr.tree:null);

            root_0 = (Object)adaptor.nil();
            // 851:2: -> ^( ITEM ( $expr)? )
            {
                // ES3.g3:851:5: ^( ITEM ( $expr)? )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(ITEM, "ITEM"), root_1);

                // ES3.g3:851:13: ( $expr)?
                if ( stream_expr.hasNext() ) {
                    adaptor.addChild(root_1, stream_expr.nextTree());

                }
                stream_expr.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "arrayItem"

    public static class objectLiteral_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "objectLiteral"
    // ES3.g3:854:1: objectLiteral : lb= LBRACE ( nameValuePair ( COMMA nameValuePair )* )? RBRACE -> ^( OBJECT[$lb, \"OBJECT\"] ( nameValuePair )* ) ;
    public final ES3Parser.objectLiteral_return objectLiteral() throws RecognitionException {
        ES3Parser.objectLiteral_return retval = new ES3Parser.objectLiteral_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token lb=null;
        Token COMMA32=null;
        Token RBRACE34=null;
        ES3Parser.nameValuePair_return nameValuePair31 = null;

        ES3Parser.nameValuePair_return nameValuePair33 = null;


        Object lb_tree=null;
        Object COMMA32_tree=null;
        Object RBRACE34_tree=null;
        RewriteRuleTokenStream stream_RBRACE=new RewriteRuleTokenStream(adaptor,"token RBRACE");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleTokenStream stream_LBRACE=new RewriteRuleTokenStream(adaptor,"token LBRACE");
        RewriteRuleSubtreeStream stream_nameValuePair=new RewriteRuleSubtreeStream(adaptor,"rule nameValuePair");
        try {
            // ES3.g3:855:2: (lb= LBRACE ( nameValuePair ( COMMA nameValuePair )* )? RBRACE -> ^( OBJECT[$lb, \"OBJECT\"] ( nameValuePair )* ) )
            // ES3.g3:855:4: lb= LBRACE ( nameValuePair ( COMMA nameValuePair )* )? RBRACE
            {
            lb=(Token)match(input,LBRACE,FOLLOW_LBRACE_in_objectLiteral3230);  
            stream_LBRACE.add(lb);

            // ES3.g3:855:14: ( nameValuePair ( COMMA nameValuePair )* )?
            int alt9=2;
            int LA9_0 = input.LA(1);

            if ( ((LA9_0>=Identifier && LA9_0<=StringLiteral)||(LA9_0>=DecimalLiteral && LA9_0<=HexIntegerLiteral)) ) {
                alt9=1;
            }
            switch (alt9) {
                case 1 :
                    // ES3.g3:855:16: nameValuePair ( COMMA nameValuePair )*
                    {
                    pushFollow(FOLLOW_nameValuePair_in_objectLiteral3234);
                    nameValuePair31=nameValuePair();

                    state._fsp--;

                    stream_nameValuePair.add(nameValuePair31.getTree());
                    // ES3.g3:855:30: ( COMMA nameValuePair )*
                    loop8:
                    do {
                        int alt8=2;
                        int LA8_0 = input.LA(1);

                        if ( (LA8_0==COMMA) ) {
                            alt8=1;
                        }


                        switch (alt8) {
                    	case 1 :
                    	    // ES3.g3:855:32: COMMA nameValuePair
                    	    {
                    	    COMMA32=(Token)match(input,COMMA,FOLLOW_COMMA_in_objectLiteral3238);  
                    	    stream_COMMA.add(COMMA32);

                    	    pushFollow(FOLLOW_nameValuePair_in_objectLiteral3240);
                    	    nameValuePair33=nameValuePair();

                    	    state._fsp--;

                    	    stream_nameValuePair.add(nameValuePair33.getTree());

                    	    }
                    	    break;

                    	default :
                    	    break loop8;
                        }
                    } while (true);


                    }
                    break;

            }

            RBRACE34=(Token)match(input,RBRACE,FOLLOW_RBRACE_in_objectLiteral3248);  
            stream_RBRACE.add(RBRACE34);



            // AST REWRITE
            // elements: nameValuePair
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 856:2: -> ^( OBJECT[$lb, \"OBJECT\"] ( nameValuePair )* )
            {
                // ES3.g3:856:5: ^( OBJECT[$lb, \"OBJECT\"] ( nameValuePair )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(OBJECT, lb, "OBJECT"), root_1);

                // ES3.g3:856:30: ( nameValuePair )*
                while ( stream_nameValuePair.hasNext() ) {
                    adaptor.addChild(root_1, stream_nameValuePair.nextTree());

                }
                stream_nameValuePair.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "objectLiteral"

    public static class nameValuePair_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "nameValuePair"
    // ES3.g3:859:1: nameValuePair : propertyName COLON assignmentExpression -> ^( NAMEDVALUE propertyName assignmentExpression ) ;
    public final ES3Parser.nameValuePair_return nameValuePair() throws RecognitionException {
        ES3Parser.nameValuePair_return retval = new ES3Parser.nameValuePair_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token COLON36=null;
        ES3Parser.propertyName_return propertyName35 = null;

        ES3Parser.assignmentExpression_return assignmentExpression37 = null;


        Object COLON36_tree=null;
        RewriteRuleTokenStream stream_COLON=new RewriteRuleTokenStream(adaptor,"token COLON");
        RewriteRuleSubtreeStream stream_propertyName=new RewriteRuleSubtreeStream(adaptor,"rule propertyName");
        RewriteRuleSubtreeStream stream_assignmentExpression=new RewriteRuleSubtreeStream(adaptor,"rule assignmentExpression");
        try {
            // ES3.g3:860:2: ( propertyName COLON assignmentExpression -> ^( NAMEDVALUE propertyName assignmentExpression ) )
            // ES3.g3:860:4: propertyName COLON assignmentExpression
            {
            pushFollow(FOLLOW_propertyName_in_nameValuePair3273);
            propertyName35=propertyName();

            state._fsp--;

            stream_propertyName.add(propertyName35.getTree());
            COLON36=(Token)match(input,COLON,FOLLOW_COLON_in_nameValuePair3275);  
            stream_COLON.add(COLON36);

            pushFollow(FOLLOW_assignmentExpression_in_nameValuePair3277);
            assignmentExpression37=assignmentExpression();

            state._fsp--;

            stream_assignmentExpression.add(assignmentExpression37.getTree());


            // AST REWRITE
            // elements: assignmentExpression, propertyName
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 861:2: -> ^( NAMEDVALUE propertyName assignmentExpression )
            {
                // ES3.g3:861:5: ^( NAMEDVALUE propertyName assignmentExpression )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(NAMEDVALUE, "NAMEDVALUE"), root_1);

                adaptor.addChild(root_1, stream_propertyName.nextTree());
                adaptor.addChild(root_1, stream_assignmentExpression.nextTree());

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "nameValuePair"

    public static class propertyName_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "propertyName"
    // ES3.g3:864:1: propertyName : ( Identifier | StringLiteral | numericLiteral );
    public final ES3Parser.propertyName_return propertyName() throws RecognitionException {
        ES3Parser.propertyName_return retval = new ES3Parser.propertyName_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token Identifier38=null;
        Token StringLiteral39=null;
        ES3Parser.numericLiteral_return numericLiteral40 = null;


        Object Identifier38_tree=null;
        Object StringLiteral39_tree=null;

        try {
            // ES3.g3:865:2: ( Identifier | StringLiteral | numericLiteral )
            int alt10=3;
            switch ( input.LA(1) ) {
            case Identifier:
                {
                alt10=1;
                }
                break;
            case StringLiteral:
                {
                alt10=2;
                }
                break;
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt10=3;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 10, 0, input);

                throw nvae;
            }

            switch (alt10) {
                case 1 :
                    // ES3.g3:865:4: Identifier
                    {
                    root_0 = (Object)adaptor.nil();

                    Identifier38=(Token)match(input,Identifier,FOLLOW_Identifier_in_propertyName3301); 
                    Identifier38_tree = (Object)adaptor.create(Identifier38);
                    adaptor.addChild(root_0, Identifier38_tree);


                    }
                    break;
                case 2 :
                    // ES3.g3:866:4: StringLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    StringLiteral39=(Token)match(input,StringLiteral,FOLLOW_StringLiteral_in_propertyName3306); 
                    StringLiteral39_tree = (Object)adaptor.create(StringLiteral39);
                    adaptor.addChild(root_0, StringLiteral39_tree);


                    }
                    break;
                case 3 :
                    // ES3.g3:867:4: numericLiteral
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_numericLiteral_in_propertyName3311);
                    numericLiteral40=numericLiteral();

                    state._fsp--;

                    adaptor.addChild(root_0, numericLiteral40.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "propertyName"

    public static class memberExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "memberExpression"
    // ES3.g3:879:1: memberExpression : ( primaryExpression | functionExpression | newExpression );
    public final ES3Parser.memberExpression_return memberExpression() throws RecognitionException {
        ES3Parser.memberExpression_return retval = new ES3Parser.memberExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.primaryExpression_return primaryExpression41 = null;

        ES3Parser.functionExpression_return functionExpression42 = null;

        ES3Parser.newExpression_return newExpression43 = null;



        try {
            // ES3.g3:880:2: ( primaryExpression | functionExpression | newExpression )
            int alt11=3;
            switch ( input.LA(1) ) {
            case NULL:
            case TRUE:
            case FALSE:
            case THIS:
            case LBRACE:
            case LPAREN:
            case LBRACK:
            case Identifier:
            case StringLiteral:
            case RegularExpressionLiteral:
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt11=1;
                }
                break;
            case FUNCTION:
                {
                alt11=2;
                }
                break;
            case NEW:
                {
                alt11=3;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 11, 0, input);

                throw nvae;
            }

            switch (alt11) {
                case 1 :
                    // ES3.g3:880:4: primaryExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_primaryExpression_in_memberExpression3329);
                    primaryExpression41=primaryExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, primaryExpression41.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:881:4: functionExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_functionExpression_in_memberExpression3334);
                    functionExpression42=functionExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, functionExpression42.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:882:4: newExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_newExpression_in_memberExpression3339);
                    newExpression43=newExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, newExpression43.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "memberExpression"

    public static class newExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "newExpression"
    // ES3.g3:885:1: newExpression : NEW primaryExpression ;
    public final ES3Parser.newExpression_return newExpression() throws RecognitionException {
        ES3Parser.newExpression_return retval = new ES3Parser.newExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token NEW44=null;
        ES3Parser.primaryExpression_return primaryExpression45 = null;


        Object NEW44_tree=null;

        try {
            // ES3.g3:886:2: ( NEW primaryExpression )
            // ES3.g3:886:4: NEW primaryExpression
            {
            root_0 = (Object)adaptor.nil();

            NEW44=(Token)match(input,NEW,FOLLOW_NEW_in_newExpression3350); 
            NEW44_tree = (Object)adaptor.create(NEW44);
            root_0 = (Object)adaptor.becomeRoot(NEW44_tree, root_0);

            pushFollow(FOLLOW_primaryExpression_in_newExpression3353);
            primaryExpression45=primaryExpression();

            state._fsp--;

            adaptor.addChild(root_0, primaryExpression45.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "newExpression"

    public static class arguments_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "arguments"
    // ES3.g3:890:1: arguments : LPAREN ( assignmentExpression ( COMMA assignmentExpression )* )? RPAREN -> ^( ARGS ( assignmentExpression )* ) ;
    public final ES3Parser.arguments_return arguments() throws RecognitionException {
        ES3Parser.arguments_return retval = new ES3Parser.arguments_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LPAREN46=null;
        Token COMMA48=null;
        Token RPAREN50=null;
        ES3Parser.assignmentExpression_return assignmentExpression47 = null;

        ES3Parser.assignmentExpression_return assignmentExpression49 = null;


        Object LPAREN46_tree=null;
        Object COMMA48_tree=null;
        Object RPAREN50_tree=null;
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");
        RewriteRuleSubtreeStream stream_assignmentExpression=new RewriteRuleSubtreeStream(adaptor,"rule assignmentExpression");
        try {
            // ES3.g3:891:2: ( LPAREN ( assignmentExpression ( COMMA assignmentExpression )* )? RPAREN -> ^( ARGS ( assignmentExpression )* ) )
            // ES3.g3:891:4: LPAREN ( assignmentExpression ( COMMA assignmentExpression )* )? RPAREN
            {
            LPAREN46=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_arguments3366);  
            stream_LPAREN.add(LPAREN46);

            // ES3.g3:891:11: ( assignmentExpression ( COMMA assignmentExpression )* )?
            int alt13=2;
            int LA13_0 = input.LA(1);

            if ( ((LA13_0>=NULL && LA13_0<=FALSE)||LA13_0==DELETE||LA13_0==FUNCTION||LA13_0==NEW||LA13_0==THIS||LA13_0==TYPEOF||LA13_0==VOID||LA13_0==LBRACE||LA13_0==LPAREN||LA13_0==LBRACK||(LA13_0>=ADD && LA13_0<=SUB)||(LA13_0>=INC && LA13_0<=DEC)||(LA13_0>=NOT && LA13_0<=INV)||(LA13_0>=Identifier && LA13_0<=StringLiteral)||LA13_0==RegularExpressionLiteral||(LA13_0>=DecimalLiteral && LA13_0<=HexIntegerLiteral)) ) {
                alt13=1;
            }
            switch (alt13) {
                case 1 :
                    // ES3.g3:891:13: assignmentExpression ( COMMA assignmentExpression )*
                    {
                    pushFollow(FOLLOW_assignmentExpression_in_arguments3370);
                    assignmentExpression47=assignmentExpression();

                    state._fsp--;

                    stream_assignmentExpression.add(assignmentExpression47.getTree());
                    // ES3.g3:891:34: ( COMMA assignmentExpression )*
                    loop12:
                    do {
                        int alt12=2;
                        int LA12_0 = input.LA(1);

                        if ( (LA12_0==COMMA) ) {
                            alt12=1;
                        }


                        switch (alt12) {
                    	case 1 :
                    	    // ES3.g3:891:36: COMMA assignmentExpression
                    	    {
                    	    COMMA48=(Token)match(input,COMMA,FOLLOW_COMMA_in_arguments3374);  
                    	    stream_COMMA.add(COMMA48);

                    	    pushFollow(FOLLOW_assignmentExpression_in_arguments3376);
                    	    assignmentExpression49=assignmentExpression();

                    	    state._fsp--;

                    	    stream_assignmentExpression.add(assignmentExpression49.getTree());

                    	    }
                    	    break;

                    	default :
                    	    break loop12;
                        }
                    } while (true);


                    }
                    break;

            }

            RPAREN50=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_arguments3384);  
            stream_RPAREN.add(RPAREN50);



            // AST REWRITE
            // elements: assignmentExpression
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 892:2: -> ^( ARGS ( assignmentExpression )* )
            {
                // ES3.g3:892:5: ^( ARGS ( assignmentExpression )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(ARGS, "ARGS"), root_1);

                // ES3.g3:892:13: ( assignmentExpression )*
                while ( stream_assignmentExpression.hasNext() ) {
                    adaptor.addChild(root_1, stream_assignmentExpression.nextTree());

                }
                stream_assignmentExpression.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "arguments"

    public static class leftHandSideExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "leftHandSideExpression"
    // ES3.g3:895:1: leftHandSideExpression : ( memberExpression -> memberExpression ) ( arguments -> ^( CALL $leftHandSideExpression arguments ) | LBRACK expression RBRACK -> ^( BYINDEX $leftHandSideExpression expression ) | DOT Identifier -> ^( BYFIELD $leftHandSideExpression Identifier ) )* ;
    public final ES3Parser.leftHandSideExpression_return leftHandSideExpression() throws RecognitionException {
        ES3Parser.leftHandSideExpression_return retval = new ES3Parser.leftHandSideExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LBRACK53=null;
        Token RBRACK55=null;
        Token DOT56=null;
        Token Identifier57=null;
        ES3Parser.memberExpression_return memberExpression51 = null;

        ES3Parser.arguments_return arguments52 = null;

        ES3Parser.expression_return expression54 = null;


        Object LBRACK53_tree=null;
        Object RBRACK55_tree=null;
        Object DOT56_tree=null;
        Object Identifier57_tree=null;
        RewriteRuleTokenStream stream_RBRACK=new RewriteRuleTokenStream(adaptor,"token RBRACK");
        RewriteRuleTokenStream stream_LBRACK=new RewriteRuleTokenStream(adaptor,"token LBRACK");
        RewriteRuleTokenStream stream_DOT=new RewriteRuleTokenStream(adaptor,"token DOT");
        RewriteRuleTokenStream stream_Identifier=new RewriteRuleTokenStream(adaptor,"token Identifier");
        RewriteRuleSubtreeStream stream_memberExpression=new RewriteRuleSubtreeStream(adaptor,"rule memberExpression");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_arguments=new RewriteRuleSubtreeStream(adaptor,"rule arguments");
        try {
            // ES3.g3:896:2: ( ( memberExpression -> memberExpression ) ( arguments -> ^( CALL $leftHandSideExpression arguments ) | LBRACK expression RBRACK -> ^( BYINDEX $leftHandSideExpression expression ) | DOT Identifier -> ^( BYFIELD $leftHandSideExpression Identifier ) )* )
            // ES3.g3:897:2: ( memberExpression -> memberExpression ) ( arguments -> ^( CALL $leftHandSideExpression arguments ) | LBRACK expression RBRACK -> ^( BYINDEX $leftHandSideExpression expression ) | DOT Identifier -> ^( BYFIELD $leftHandSideExpression Identifier ) )*
            {
            // ES3.g3:897:2: ( memberExpression -> memberExpression )
            // ES3.g3:898:3: memberExpression
            {
            pushFollow(FOLLOW_memberExpression_in_leftHandSideExpression3413);
            memberExpression51=memberExpression();

            state._fsp--;

            stream_memberExpression.add(memberExpression51.getTree());


            // AST REWRITE
            // elements: memberExpression
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 898:22: -> memberExpression
            {
                adaptor.addChild(root_0, stream_memberExpression.nextTree());

            }

            retval.tree = root_0;
            }

            // ES3.g3:900:2: ( arguments -> ^( CALL $leftHandSideExpression arguments ) | LBRACK expression RBRACK -> ^( BYINDEX $leftHandSideExpression expression ) | DOT Identifier -> ^( BYFIELD $leftHandSideExpression Identifier ) )*
            loop14:
            do {
                int alt14=4;
                switch ( input.LA(1) ) {
                case LPAREN:
                    {
                    alt14=1;
                    }
                    break;
                case LBRACK:
                    {
                    alt14=2;
                    }
                    break;
                case DOT:
                    {
                    alt14=3;
                    }
                    break;

                }

                switch (alt14) {
            	case 1 :
            	    // ES3.g3:901:3: arguments
            	    {
            	    pushFollow(FOLLOW_arguments_in_leftHandSideExpression3429);
            	    arguments52=arguments();

            	    state._fsp--;

            	    stream_arguments.add(arguments52.getTree());


            	    // AST REWRITE
            	    // elements: leftHandSideExpression, arguments
            	    // token labels: 
            	    // rule labels: retval
            	    // token list labels: 
            	    // rule list labels: 
            	    // wildcard labels: 
            	    retval.tree = root_0;
            	    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            	    root_0 = (Object)adaptor.nil();
            	    // 901:15: -> ^( CALL $leftHandSideExpression arguments )
            	    {
            	        // ES3.g3:901:18: ^( CALL $leftHandSideExpression arguments )
            	        {
            	        Object root_1 = (Object)adaptor.nil();
            	        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(CALL, "CALL"), root_1);

            	        adaptor.addChild(root_1, stream_retval.nextTree());
            	        adaptor.addChild(root_1, stream_arguments.nextTree());

            	        adaptor.addChild(root_0, root_1);
            	        }

            	    }

            	    retval.tree = root_0;
            	    }
            	    break;
            	case 2 :
            	    // ES3.g3:902:5: LBRACK expression RBRACK
            	    {
            	    LBRACK53=(Token)match(input,LBRACK,FOLLOW_LBRACK_in_leftHandSideExpression3450);  
            	    stream_LBRACK.add(LBRACK53);

            	    pushFollow(FOLLOW_expression_in_leftHandSideExpression3452);
            	    expression54=expression();

            	    state._fsp--;

            	    stream_expression.add(expression54.getTree());
            	    RBRACK55=(Token)match(input,RBRACK,FOLLOW_RBRACK_in_leftHandSideExpression3454);  
            	    stream_RBRACK.add(RBRACK55);



            	    // AST REWRITE
            	    // elements: leftHandSideExpression, expression
            	    // token labels: 
            	    // rule labels: retval
            	    // token list labels: 
            	    // rule list labels: 
            	    // wildcard labels: 
            	    retval.tree = root_0;
            	    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            	    root_0 = (Object)adaptor.nil();
            	    // 902:30: -> ^( BYINDEX $leftHandSideExpression expression )
            	    {
            	        // ES3.g3:902:33: ^( BYINDEX $leftHandSideExpression expression )
            	        {
            	        Object root_1 = (Object)adaptor.nil();
            	        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(BYINDEX, "BYINDEX"), root_1);

            	        adaptor.addChild(root_1, stream_retval.nextTree());
            	        adaptor.addChild(root_1, stream_expression.nextTree());

            	        adaptor.addChild(root_0, root_1);
            	        }

            	    }

            	    retval.tree = root_0;
            	    }
            	    break;
            	case 3 :
            	    // ES3.g3:903:5: DOT Identifier
            	    {
            	    DOT56=(Token)match(input,DOT,FOLLOW_DOT_in_leftHandSideExpression3473);  
            	    stream_DOT.add(DOT56);

            	    Identifier57=(Token)match(input,Identifier,FOLLOW_Identifier_in_leftHandSideExpression3475);  
            	    stream_Identifier.add(Identifier57);



            	    // AST REWRITE
            	    // elements: leftHandSideExpression, Identifier
            	    // token labels: 
            	    // rule labels: retval
            	    // token list labels: 
            	    // rule list labels: 
            	    // wildcard labels: 
            	    retval.tree = root_0;
            	    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            	    root_0 = (Object)adaptor.nil();
            	    // 903:21: -> ^( BYFIELD $leftHandSideExpression Identifier )
            	    {
            	        // ES3.g3:903:24: ^( BYFIELD $leftHandSideExpression Identifier )
            	        {
            	        Object root_1 = (Object)adaptor.nil();
            	        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(BYFIELD, "BYFIELD"), root_1);

            	        adaptor.addChild(root_1, stream_retval.nextTree());
            	        adaptor.addChild(root_1, stream_Identifier.nextNode());

            	        adaptor.addChild(root_0, root_1);
            	        }

            	    }

            	    retval.tree = root_0;
            	    }
            	    break;

            	default :
            	    break loop14;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "leftHandSideExpression"

    public static class postfixExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "postfixExpression"
    // ES3.g3:917:1: postfixExpression : leftHandSideExpression ( postfixOperator )? ;
    public final ES3Parser.postfixExpression_return postfixExpression() throws RecognitionException {
        ES3Parser.postfixExpression_return retval = new ES3Parser.postfixExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.leftHandSideExpression_return leftHandSideExpression58 = null;

        ES3Parser.postfixOperator_return postfixOperator59 = null;



        try {
            // ES3.g3:918:2: ( leftHandSideExpression ( postfixOperator )? )
            // ES3.g3:918:4: leftHandSideExpression ( postfixOperator )?
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_leftHandSideExpression_in_postfixExpression3510);
            leftHandSideExpression58=leftHandSideExpression();

            state._fsp--;

            adaptor.addChild(root_0, leftHandSideExpression58.getTree());
             if (input.LA(1) == INC || input.LA(1) == DEC) promoteEOL(null); 
            // ES3.g3:918:95: ( postfixOperator )?
            int alt15=2;
            int LA15_0 = input.LA(1);

            if ( ((LA15_0>=INC && LA15_0<=DEC)) ) {
                alt15=1;
            }
            switch (alt15) {
                case 1 :
                    // ES3.g3:918:97: postfixOperator
                    {
                    pushFollow(FOLLOW_postfixOperator_in_postfixExpression3516);
                    postfixOperator59=postfixOperator();

                    state._fsp--;

                    root_0 = (Object)adaptor.becomeRoot(postfixOperator59.getTree(), root_0);

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "postfixExpression"

    public static class postfixOperator_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "postfixOperator"
    // ES3.g3:921:1: postfixOperator : (op= INC | op= DEC );
    public final ES3Parser.postfixOperator_return postfixOperator() throws RecognitionException {
        ES3Parser.postfixOperator_return retval = new ES3Parser.postfixOperator_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token op=null;

        Object op_tree=null;

        try {
            // ES3.g3:922:2: (op= INC | op= DEC )
            int alt16=2;
            int LA16_0 = input.LA(1);

            if ( (LA16_0==INC) ) {
                alt16=1;
            }
            else if ( (LA16_0==DEC) ) {
                alt16=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 16, 0, input);

                throw nvae;
            }
            switch (alt16) {
                case 1 :
                    // ES3.g3:922:4: op= INC
                    {
                    root_0 = (Object)adaptor.nil();

                    op=(Token)match(input,INC,FOLLOW_INC_in_postfixOperator3534); 
                    op_tree = (Object)adaptor.create(op);
                    adaptor.addChild(root_0, op_tree);

                     op.setType(PINC); 

                    }
                    break;
                case 2 :
                    // ES3.g3:923:4: op= DEC
                    {
                    root_0 = (Object)adaptor.nil();

                    op=(Token)match(input,DEC,FOLLOW_DEC_in_postfixOperator3543); 
                    op_tree = (Object)adaptor.create(op);
                    adaptor.addChild(root_0, op_tree);

                     op.setType(PDEC); 

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "postfixOperator"

    public static class unaryExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "unaryExpression"
    // ES3.g3:930:1: unaryExpression : ( postfixExpression | unaryOperator unaryExpression );
    public final ES3Parser.unaryExpression_return unaryExpression() throws RecognitionException {
        ES3Parser.unaryExpression_return retval = new ES3Parser.unaryExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.postfixExpression_return postfixExpression60 = null;

        ES3Parser.unaryOperator_return unaryOperator61 = null;

        ES3Parser.unaryExpression_return unaryExpression62 = null;



        try {
            // ES3.g3:931:2: ( postfixExpression | unaryOperator unaryExpression )
            int alt17=2;
            int LA17_0 = input.LA(1);

            if ( ((LA17_0>=NULL && LA17_0<=FALSE)||LA17_0==FUNCTION||LA17_0==NEW||LA17_0==THIS||LA17_0==LBRACE||LA17_0==LPAREN||LA17_0==LBRACK||(LA17_0>=Identifier && LA17_0<=StringLiteral)||LA17_0==RegularExpressionLiteral||(LA17_0>=DecimalLiteral && LA17_0<=HexIntegerLiteral)) ) {
                alt17=1;
            }
            else if ( (LA17_0==DELETE||LA17_0==TYPEOF||LA17_0==VOID||(LA17_0>=ADD && LA17_0<=SUB)||(LA17_0>=INC && LA17_0<=DEC)||(LA17_0>=NOT && LA17_0<=INV)) ) {
                alt17=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 17, 0, input);

                throw nvae;
            }
            switch (alt17) {
                case 1 :
                    // ES3.g3:931:4: postfixExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_postfixExpression_in_unaryExpression3560);
                    postfixExpression60=postfixExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, postfixExpression60.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:932:4: unaryOperator unaryExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_unaryOperator_in_unaryExpression3565);
                    unaryOperator61=unaryOperator();

                    state._fsp--;

                    root_0 = (Object)adaptor.becomeRoot(unaryOperator61.getTree(), root_0);
                    pushFollow(FOLLOW_unaryExpression_in_unaryExpression3568);
                    unaryExpression62=unaryExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, unaryExpression62.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "unaryExpression"

    public static class unaryOperator_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "unaryOperator"
    // ES3.g3:935:1: unaryOperator : ( DELETE | VOID | TYPEOF | INC | DEC | op= ADD | op= SUB | INV | NOT );
    public final ES3Parser.unaryOperator_return unaryOperator() throws RecognitionException {
        ES3Parser.unaryOperator_return retval = new ES3Parser.unaryOperator_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token op=null;
        Token DELETE63=null;
        Token VOID64=null;
        Token TYPEOF65=null;
        Token INC66=null;
        Token DEC67=null;
        Token INV68=null;
        Token NOT69=null;

        Object op_tree=null;
        Object DELETE63_tree=null;
        Object VOID64_tree=null;
        Object TYPEOF65_tree=null;
        Object INC66_tree=null;
        Object DEC67_tree=null;
        Object INV68_tree=null;
        Object NOT69_tree=null;

        try {
            // ES3.g3:936:2: ( DELETE | VOID | TYPEOF | INC | DEC | op= ADD | op= SUB | INV | NOT )
            int alt18=9;
            switch ( input.LA(1) ) {
            case DELETE:
                {
                alt18=1;
                }
                break;
            case VOID:
                {
                alt18=2;
                }
                break;
            case TYPEOF:
                {
                alt18=3;
                }
                break;
            case INC:
                {
                alt18=4;
                }
                break;
            case DEC:
                {
                alt18=5;
                }
                break;
            case ADD:
                {
                alt18=6;
                }
                break;
            case SUB:
                {
                alt18=7;
                }
                break;
            case INV:
                {
                alt18=8;
                }
                break;
            case NOT:
                {
                alt18=9;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 18, 0, input);

                throw nvae;
            }

            switch (alt18) {
                case 1 :
                    // ES3.g3:936:4: DELETE
                    {
                    root_0 = (Object)adaptor.nil();

                    DELETE63=(Token)match(input,DELETE,FOLLOW_DELETE_in_unaryOperator3580); 
                    DELETE63_tree = (Object)adaptor.create(DELETE63);
                    adaptor.addChild(root_0, DELETE63_tree);


                    }
                    break;
                case 2 :
                    // ES3.g3:937:4: VOID
                    {
                    root_0 = (Object)adaptor.nil();

                    VOID64=(Token)match(input,VOID,FOLLOW_VOID_in_unaryOperator3585); 
                    VOID64_tree = (Object)adaptor.create(VOID64);
                    adaptor.addChild(root_0, VOID64_tree);


                    }
                    break;
                case 3 :
                    // ES3.g3:938:4: TYPEOF
                    {
                    root_0 = (Object)adaptor.nil();

                    TYPEOF65=(Token)match(input,TYPEOF,FOLLOW_TYPEOF_in_unaryOperator3590); 
                    TYPEOF65_tree = (Object)adaptor.create(TYPEOF65);
                    adaptor.addChild(root_0, TYPEOF65_tree);


                    }
                    break;
                case 4 :
                    // ES3.g3:939:4: INC
                    {
                    root_0 = (Object)adaptor.nil();

                    INC66=(Token)match(input,INC,FOLLOW_INC_in_unaryOperator3595); 
                    INC66_tree = (Object)adaptor.create(INC66);
                    adaptor.addChild(root_0, INC66_tree);


                    }
                    break;
                case 5 :
                    // ES3.g3:940:4: DEC
                    {
                    root_0 = (Object)adaptor.nil();

                    DEC67=(Token)match(input,DEC,FOLLOW_DEC_in_unaryOperator3600); 
                    DEC67_tree = (Object)adaptor.create(DEC67);
                    adaptor.addChild(root_0, DEC67_tree);


                    }
                    break;
                case 6 :
                    // ES3.g3:941:4: op= ADD
                    {
                    root_0 = (Object)adaptor.nil();

                    op=(Token)match(input,ADD,FOLLOW_ADD_in_unaryOperator3607); 
                    op_tree = (Object)adaptor.create(op);
                    adaptor.addChild(root_0, op_tree);

                     op.setType(POS); 

                    }
                    break;
                case 7 :
                    // ES3.g3:942:4: op= SUB
                    {
                    root_0 = (Object)adaptor.nil();

                    op=(Token)match(input,SUB,FOLLOW_SUB_in_unaryOperator3616); 
                    op_tree = (Object)adaptor.create(op);
                    adaptor.addChild(root_0, op_tree);

                     op.setType(NEG); 

                    }
                    break;
                case 8 :
                    // ES3.g3:943:4: INV
                    {
                    root_0 = (Object)adaptor.nil();

                    INV68=(Token)match(input,INV,FOLLOW_INV_in_unaryOperator3623); 
                    INV68_tree = (Object)adaptor.create(INV68);
                    adaptor.addChild(root_0, INV68_tree);


                    }
                    break;
                case 9 :
                    // ES3.g3:944:4: NOT
                    {
                    root_0 = (Object)adaptor.nil();

                    NOT69=(Token)match(input,NOT,FOLLOW_NOT_in_unaryOperator3628); 
                    NOT69_tree = (Object)adaptor.create(NOT69);
                    adaptor.addChild(root_0, NOT69_tree);


                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "unaryOperator"

    public static class multiplicativeExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "multiplicativeExpression"
    // ES3.g3:951:1: multiplicativeExpression : unaryExpression ( ( MUL | DIV | MOD ) unaryExpression )* ;
    public final ES3Parser.multiplicativeExpression_return multiplicativeExpression() throws RecognitionException {
        ES3Parser.multiplicativeExpression_return retval = new ES3Parser.multiplicativeExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set71=null;
        ES3Parser.unaryExpression_return unaryExpression70 = null;

        ES3Parser.unaryExpression_return unaryExpression72 = null;


        Object set71_tree=null;

        try {
            // ES3.g3:952:2: ( unaryExpression ( ( MUL | DIV | MOD ) unaryExpression )* )
            // ES3.g3:952:4: unaryExpression ( ( MUL | DIV | MOD ) unaryExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_unaryExpression_in_multiplicativeExpression3643);
            unaryExpression70=unaryExpression();

            state._fsp--;

            adaptor.addChild(root_0, unaryExpression70.getTree());
            // ES3.g3:952:20: ( ( MUL | DIV | MOD ) unaryExpression )*
            loop19:
            do {
                int alt19=2;
                int LA19_0 = input.LA(1);

                if ( ((LA19_0>=MUL && LA19_0<=MOD)||LA19_0==DIV) ) {
                    alt19=1;
                }


                switch (alt19) {
            	case 1 :
            	    // ES3.g3:952:22: ( MUL | DIV | MOD ) unaryExpression
            	    {
            	    set71=(Token)input.LT(1);
            	    set71=(Token)input.LT(1);
            	    if ( (input.LA(1)>=MUL && input.LA(1)<=MOD)||input.LA(1)==DIV ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set71), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_unaryExpression_in_multiplicativeExpression3662);
            	    unaryExpression72=unaryExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, unaryExpression72.getTree());

            	    }
            	    break;

            	default :
            	    break loop19;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "multiplicativeExpression"

    public static class additiveExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "additiveExpression"
    // ES3.g3:959:1: additiveExpression : multiplicativeExpression ( ( ADD | SUB ) multiplicativeExpression )* ;
    public final ES3Parser.additiveExpression_return additiveExpression() throws RecognitionException {
        ES3Parser.additiveExpression_return retval = new ES3Parser.additiveExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set74=null;
        ES3Parser.multiplicativeExpression_return multiplicativeExpression73 = null;

        ES3Parser.multiplicativeExpression_return multiplicativeExpression75 = null;


        Object set74_tree=null;

        try {
            // ES3.g3:960:2: ( multiplicativeExpression ( ( ADD | SUB ) multiplicativeExpression )* )
            // ES3.g3:960:4: multiplicativeExpression ( ( ADD | SUB ) multiplicativeExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_multiplicativeExpression_in_additiveExpression3680);
            multiplicativeExpression73=multiplicativeExpression();

            state._fsp--;

            adaptor.addChild(root_0, multiplicativeExpression73.getTree());
            // ES3.g3:960:29: ( ( ADD | SUB ) multiplicativeExpression )*
            loop20:
            do {
                int alt20=2;
                int LA20_0 = input.LA(1);

                if ( ((LA20_0>=ADD && LA20_0<=SUB)) ) {
                    alt20=1;
                }


                switch (alt20) {
            	case 1 :
            	    // ES3.g3:960:31: ( ADD | SUB ) multiplicativeExpression
            	    {
            	    set74=(Token)input.LT(1);
            	    set74=(Token)input.LT(1);
            	    if ( (input.LA(1)>=ADD && input.LA(1)<=SUB) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set74), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_multiplicativeExpression_in_additiveExpression3695);
            	    multiplicativeExpression75=multiplicativeExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, multiplicativeExpression75.getTree());

            	    }
            	    break;

            	default :
            	    break loop20;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "additiveExpression"

    public static class shiftExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "shiftExpression"
    // ES3.g3:967:1: shiftExpression : additiveExpression ( ( SHL | SHR | SHU ) additiveExpression )* ;
    public final ES3Parser.shiftExpression_return shiftExpression() throws RecognitionException {
        ES3Parser.shiftExpression_return retval = new ES3Parser.shiftExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set77=null;
        ES3Parser.additiveExpression_return additiveExpression76 = null;

        ES3Parser.additiveExpression_return additiveExpression78 = null;


        Object set77_tree=null;

        try {
            // ES3.g3:968:2: ( additiveExpression ( ( SHL | SHR | SHU ) additiveExpression )* )
            // ES3.g3:968:4: additiveExpression ( ( SHL | SHR | SHU ) additiveExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_additiveExpression_in_shiftExpression3714);
            additiveExpression76=additiveExpression();

            state._fsp--;

            adaptor.addChild(root_0, additiveExpression76.getTree());
            // ES3.g3:968:23: ( ( SHL | SHR | SHU ) additiveExpression )*
            loop21:
            do {
                int alt21=2;
                int LA21_0 = input.LA(1);

                if ( ((LA21_0>=SHL && LA21_0<=SHU)) ) {
                    alt21=1;
                }


                switch (alt21) {
            	case 1 :
            	    // ES3.g3:968:25: ( SHL | SHR | SHU ) additiveExpression
            	    {
            	    set77=(Token)input.LT(1);
            	    set77=(Token)input.LT(1);
            	    if ( (input.LA(1)>=SHL && input.LA(1)<=SHU) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set77), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_additiveExpression_in_shiftExpression3733);
            	    additiveExpression78=additiveExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, additiveExpression78.getTree());

            	    }
            	    break;

            	default :
            	    break loop21;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "shiftExpression"

    public static class relationalExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "relationalExpression"
    // ES3.g3:975:1: relationalExpression : shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF | IN ) shiftExpression )* ;
    public final ES3Parser.relationalExpression_return relationalExpression() throws RecognitionException {
        ES3Parser.relationalExpression_return retval = new ES3Parser.relationalExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set80=null;
        ES3Parser.shiftExpression_return shiftExpression79 = null;

        ES3Parser.shiftExpression_return shiftExpression81 = null;


        Object set80_tree=null;

        try {
            // ES3.g3:976:2: ( shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF | IN ) shiftExpression )* )
            // ES3.g3:976:4: shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF | IN ) shiftExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_shiftExpression_in_relationalExpression3752);
            shiftExpression79=shiftExpression();

            state._fsp--;

            adaptor.addChild(root_0, shiftExpression79.getTree());
            // ES3.g3:976:20: ( ( LT | GT | LTE | GTE | INSTANCEOF | IN ) shiftExpression )*
            loop22:
            do {
                int alt22=2;
                int LA22_0 = input.LA(1);

                if ( ((LA22_0>=IN && LA22_0<=INSTANCEOF)||(LA22_0>=LT && LA22_0<=GTE)) ) {
                    alt22=1;
                }


                switch (alt22) {
            	case 1 :
            	    // ES3.g3:976:22: ( LT | GT | LTE | GTE | INSTANCEOF | IN ) shiftExpression
            	    {
            	    set80=(Token)input.LT(1);
            	    set80=(Token)input.LT(1);
            	    if ( (input.LA(1)>=IN && input.LA(1)<=INSTANCEOF)||(input.LA(1)>=LT && input.LA(1)<=GTE) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set80), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_shiftExpression_in_relationalExpression3783);
            	    shiftExpression81=shiftExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, shiftExpression81.getTree());

            	    }
            	    break;

            	default :
            	    break loop22;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "relationalExpression"

    public static class relationalExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "relationalExpressionNoIn"
    // ES3.g3:979:1: relationalExpressionNoIn : shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF ) shiftExpression )* ;
    public final ES3Parser.relationalExpressionNoIn_return relationalExpressionNoIn() throws RecognitionException {
        ES3Parser.relationalExpressionNoIn_return retval = new ES3Parser.relationalExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set83=null;
        ES3Parser.shiftExpression_return shiftExpression82 = null;

        ES3Parser.shiftExpression_return shiftExpression84 = null;


        Object set83_tree=null;

        try {
            // ES3.g3:980:2: ( shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF ) shiftExpression )* )
            // ES3.g3:980:4: shiftExpression ( ( LT | GT | LTE | GTE | INSTANCEOF ) shiftExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_shiftExpression_in_relationalExpressionNoIn3797);
            shiftExpression82=shiftExpression();

            state._fsp--;

            adaptor.addChild(root_0, shiftExpression82.getTree());
            // ES3.g3:980:20: ( ( LT | GT | LTE | GTE | INSTANCEOF ) shiftExpression )*
            loop23:
            do {
                int alt23=2;
                int LA23_0 = input.LA(1);

                if ( (LA23_0==INSTANCEOF||(LA23_0>=LT && LA23_0<=GTE)) ) {
                    alt23=1;
                }


                switch (alt23) {
            	case 1 :
            	    // ES3.g3:980:22: ( LT | GT | LTE | GTE | INSTANCEOF ) shiftExpression
            	    {
            	    set83=(Token)input.LT(1);
            	    set83=(Token)input.LT(1);
            	    if ( input.LA(1)==INSTANCEOF||(input.LA(1)>=LT && input.LA(1)<=GTE) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set83), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_shiftExpression_in_relationalExpressionNoIn3824);
            	    shiftExpression84=shiftExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, shiftExpression84.getTree());

            	    }
            	    break;

            	default :
            	    break loop23;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "relationalExpressionNoIn"

    public static class equalityExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "equalityExpression"
    // ES3.g3:987:1: equalityExpression : relationalExpression ( ( EQ | NEQ | SAME | NSAME ) relationalExpression )* ;
    public final ES3Parser.equalityExpression_return equalityExpression() throws RecognitionException {
        ES3Parser.equalityExpression_return retval = new ES3Parser.equalityExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set86=null;
        ES3Parser.relationalExpression_return relationalExpression85 = null;

        ES3Parser.relationalExpression_return relationalExpression87 = null;


        Object set86_tree=null;

        try {
            // ES3.g3:988:2: ( relationalExpression ( ( EQ | NEQ | SAME | NSAME ) relationalExpression )* )
            // ES3.g3:988:4: relationalExpression ( ( EQ | NEQ | SAME | NSAME ) relationalExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_relationalExpression_in_equalityExpression3843);
            relationalExpression85=relationalExpression();

            state._fsp--;

            adaptor.addChild(root_0, relationalExpression85.getTree());
            // ES3.g3:988:25: ( ( EQ | NEQ | SAME | NSAME ) relationalExpression )*
            loop24:
            do {
                int alt24=2;
                int LA24_0 = input.LA(1);

                if ( ((LA24_0>=EQ && LA24_0<=NSAME)) ) {
                    alt24=1;
                }


                switch (alt24) {
            	case 1 :
            	    // ES3.g3:988:27: ( EQ | NEQ | SAME | NSAME ) relationalExpression
            	    {
            	    set86=(Token)input.LT(1);
            	    set86=(Token)input.LT(1);
            	    if ( (input.LA(1)>=EQ && input.LA(1)<=NSAME) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set86), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_relationalExpression_in_equalityExpression3866);
            	    relationalExpression87=relationalExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, relationalExpression87.getTree());

            	    }
            	    break;

            	default :
            	    break loop24;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "equalityExpression"

    public static class equalityExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "equalityExpressionNoIn"
    // ES3.g3:991:1: equalityExpressionNoIn : relationalExpressionNoIn ( ( EQ | NEQ | SAME | NSAME ) relationalExpressionNoIn )* ;
    public final ES3Parser.equalityExpressionNoIn_return equalityExpressionNoIn() throws RecognitionException {
        ES3Parser.equalityExpressionNoIn_return retval = new ES3Parser.equalityExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set89=null;
        ES3Parser.relationalExpressionNoIn_return relationalExpressionNoIn88 = null;

        ES3Parser.relationalExpressionNoIn_return relationalExpressionNoIn90 = null;


        Object set89_tree=null;

        try {
            // ES3.g3:992:2: ( relationalExpressionNoIn ( ( EQ | NEQ | SAME | NSAME ) relationalExpressionNoIn )* )
            // ES3.g3:992:4: relationalExpressionNoIn ( ( EQ | NEQ | SAME | NSAME ) relationalExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_relationalExpressionNoIn_in_equalityExpressionNoIn3880);
            relationalExpressionNoIn88=relationalExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, relationalExpressionNoIn88.getTree());
            // ES3.g3:992:29: ( ( EQ | NEQ | SAME | NSAME ) relationalExpressionNoIn )*
            loop25:
            do {
                int alt25=2;
                int LA25_0 = input.LA(1);

                if ( ((LA25_0>=EQ && LA25_0<=NSAME)) ) {
                    alt25=1;
                }


                switch (alt25) {
            	case 1 :
            	    // ES3.g3:992:31: ( EQ | NEQ | SAME | NSAME ) relationalExpressionNoIn
            	    {
            	    set89=(Token)input.LT(1);
            	    set89=(Token)input.LT(1);
            	    if ( (input.LA(1)>=EQ && input.LA(1)<=NSAME) ) {
            	        input.consume();
            	        root_0 = (Object)adaptor.becomeRoot((Object)adaptor.create(set89), root_0);
            	        state.errorRecovery=false;
            	    }
            	    else {
            	        MismatchedSetException mse = new MismatchedSetException(null,input);
            	        throw mse;
            	    }

            	    pushFollow(FOLLOW_relationalExpressionNoIn_in_equalityExpressionNoIn3903);
            	    relationalExpressionNoIn90=relationalExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, relationalExpressionNoIn90.getTree());

            	    }
            	    break;

            	default :
            	    break loop25;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "equalityExpressionNoIn"

    public static class bitwiseANDExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseANDExpression"
    // ES3.g3:999:1: bitwiseANDExpression : equalityExpression ( AND equalityExpression )* ;
    public final ES3Parser.bitwiseANDExpression_return bitwiseANDExpression() throws RecognitionException {
        ES3Parser.bitwiseANDExpression_return retval = new ES3Parser.bitwiseANDExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token AND92=null;
        ES3Parser.equalityExpression_return equalityExpression91 = null;

        ES3Parser.equalityExpression_return equalityExpression93 = null;


        Object AND92_tree=null;

        try {
            // ES3.g3:1000:2: ( equalityExpression ( AND equalityExpression )* )
            // ES3.g3:1000:4: equalityExpression ( AND equalityExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_equalityExpression_in_bitwiseANDExpression3923);
            equalityExpression91=equalityExpression();

            state._fsp--;

            adaptor.addChild(root_0, equalityExpression91.getTree());
            // ES3.g3:1000:23: ( AND equalityExpression )*
            loop26:
            do {
                int alt26=2;
                int LA26_0 = input.LA(1);

                if ( (LA26_0==AND) ) {
                    alt26=1;
                }


                switch (alt26) {
            	case 1 :
            	    // ES3.g3:1000:25: AND equalityExpression
            	    {
            	    AND92=(Token)match(input,AND,FOLLOW_AND_in_bitwiseANDExpression3927); 
            	    AND92_tree = (Object)adaptor.create(AND92);
            	    root_0 = (Object)adaptor.becomeRoot(AND92_tree, root_0);

            	    pushFollow(FOLLOW_equalityExpression_in_bitwiseANDExpression3930);
            	    equalityExpression93=equalityExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, equalityExpression93.getTree());

            	    }
            	    break;

            	default :
            	    break loop26;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseANDExpression"

    public static class bitwiseANDExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseANDExpressionNoIn"
    // ES3.g3:1003:1: bitwiseANDExpressionNoIn : equalityExpressionNoIn ( AND equalityExpressionNoIn )* ;
    public final ES3Parser.bitwiseANDExpressionNoIn_return bitwiseANDExpressionNoIn() throws RecognitionException {
        ES3Parser.bitwiseANDExpressionNoIn_return retval = new ES3Parser.bitwiseANDExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token AND95=null;
        ES3Parser.equalityExpressionNoIn_return equalityExpressionNoIn94 = null;

        ES3Parser.equalityExpressionNoIn_return equalityExpressionNoIn96 = null;


        Object AND95_tree=null;

        try {
            // ES3.g3:1004:2: ( equalityExpressionNoIn ( AND equalityExpressionNoIn )* )
            // ES3.g3:1004:4: equalityExpressionNoIn ( AND equalityExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_equalityExpressionNoIn_in_bitwiseANDExpressionNoIn3944);
            equalityExpressionNoIn94=equalityExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, equalityExpressionNoIn94.getTree());
            // ES3.g3:1004:27: ( AND equalityExpressionNoIn )*
            loop27:
            do {
                int alt27=2;
                int LA27_0 = input.LA(1);

                if ( (LA27_0==AND) ) {
                    alt27=1;
                }


                switch (alt27) {
            	case 1 :
            	    // ES3.g3:1004:29: AND equalityExpressionNoIn
            	    {
            	    AND95=(Token)match(input,AND,FOLLOW_AND_in_bitwiseANDExpressionNoIn3948); 
            	    AND95_tree = (Object)adaptor.create(AND95);
            	    root_0 = (Object)adaptor.becomeRoot(AND95_tree, root_0);

            	    pushFollow(FOLLOW_equalityExpressionNoIn_in_bitwiseANDExpressionNoIn3951);
            	    equalityExpressionNoIn96=equalityExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, equalityExpressionNoIn96.getTree());

            	    }
            	    break;

            	default :
            	    break loop27;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseANDExpressionNoIn"

    public static class bitwiseXORExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseXORExpression"
    // ES3.g3:1007:1: bitwiseXORExpression : bitwiseANDExpression ( XOR bitwiseANDExpression )* ;
    public final ES3Parser.bitwiseXORExpression_return bitwiseXORExpression() throws RecognitionException {
        ES3Parser.bitwiseXORExpression_return retval = new ES3Parser.bitwiseXORExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token XOR98=null;
        ES3Parser.bitwiseANDExpression_return bitwiseANDExpression97 = null;

        ES3Parser.bitwiseANDExpression_return bitwiseANDExpression99 = null;


        Object XOR98_tree=null;

        try {
            // ES3.g3:1008:2: ( bitwiseANDExpression ( XOR bitwiseANDExpression )* )
            // ES3.g3:1008:4: bitwiseANDExpression ( XOR bitwiseANDExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseANDExpression_in_bitwiseXORExpression3967);
            bitwiseANDExpression97=bitwiseANDExpression();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseANDExpression97.getTree());
            // ES3.g3:1008:25: ( XOR bitwiseANDExpression )*
            loop28:
            do {
                int alt28=2;
                int LA28_0 = input.LA(1);

                if ( (LA28_0==XOR) ) {
                    alt28=1;
                }


                switch (alt28) {
            	case 1 :
            	    // ES3.g3:1008:27: XOR bitwiseANDExpression
            	    {
            	    XOR98=(Token)match(input,XOR,FOLLOW_XOR_in_bitwiseXORExpression3971); 
            	    XOR98_tree = (Object)adaptor.create(XOR98);
            	    root_0 = (Object)adaptor.becomeRoot(XOR98_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseANDExpression_in_bitwiseXORExpression3974);
            	    bitwiseANDExpression99=bitwiseANDExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseANDExpression99.getTree());

            	    }
            	    break;

            	default :
            	    break loop28;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseXORExpression"

    public static class bitwiseXORExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseXORExpressionNoIn"
    // ES3.g3:1011:1: bitwiseXORExpressionNoIn : bitwiseANDExpressionNoIn ( XOR bitwiseANDExpressionNoIn )* ;
    public final ES3Parser.bitwiseXORExpressionNoIn_return bitwiseXORExpressionNoIn() throws RecognitionException {
        ES3Parser.bitwiseXORExpressionNoIn_return retval = new ES3Parser.bitwiseXORExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token XOR101=null;
        ES3Parser.bitwiseANDExpressionNoIn_return bitwiseANDExpressionNoIn100 = null;

        ES3Parser.bitwiseANDExpressionNoIn_return bitwiseANDExpressionNoIn102 = null;


        Object XOR101_tree=null;

        try {
            // ES3.g3:1012:2: ( bitwiseANDExpressionNoIn ( XOR bitwiseANDExpressionNoIn )* )
            // ES3.g3:1012:4: bitwiseANDExpressionNoIn ( XOR bitwiseANDExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseANDExpressionNoIn_in_bitwiseXORExpressionNoIn3990);
            bitwiseANDExpressionNoIn100=bitwiseANDExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseANDExpressionNoIn100.getTree());
            // ES3.g3:1012:29: ( XOR bitwiseANDExpressionNoIn )*
            loop29:
            do {
                int alt29=2;
                int LA29_0 = input.LA(1);

                if ( (LA29_0==XOR) ) {
                    alt29=1;
                }


                switch (alt29) {
            	case 1 :
            	    // ES3.g3:1012:31: XOR bitwiseANDExpressionNoIn
            	    {
            	    XOR101=(Token)match(input,XOR,FOLLOW_XOR_in_bitwiseXORExpressionNoIn3994); 
            	    XOR101_tree = (Object)adaptor.create(XOR101);
            	    root_0 = (Object)adaptor.becomeRoot(XOR101_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseANDExpressionNoIn_in_bitwiseXORExpressionNoIn3997);
            	    bitwiseANDExpressionNoIn102=bitwiseANDExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseANDExpressionNoIn102.getTree());

            	    }
            	    break;

            	default :
            	    break loop29;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseXORExpressionNoIn"

    public static class bitwiseORExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseORExpression"
    // ES3.g3:1015:1: bitwiseORExpression : bitwiseXORExpression ( OR bitwiseXORExpression )* ;
    public final ES3Parser.bitwiseORExpression_return bitwiseORExpression() throws RecognitionException {
        ES3Parser.bitwiseORExpression_return retval = new ES3Parser.bitwiseORExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token OR104=null;
        ES3Parser.bitwiseXORExpression_return bitwiseXORExpression103 = null;

        ES3Parser.bitwiseXORExpression_return bitwiseXORExpression105 = null;


        Object OR104_tree=null;

        try {
            // ES3.g3:1016:2: ( bitwiseXORExpression ( OR bitwiseXORExpression )* )
            // ES3.g3:1016:4: bitwiseXORExpression ( OR bitwiseXORExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseXORExpression_in_bitwiseORExpression4012);
            bitwiseXORExpression103=bitwiseXORExpression();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseXORExpression103.getTree());
            // ES3.g3:1016:25: ( OR bitwiseXORExpression )*
            loop30:
            do {
                int alt30=2;
                int LA30_0 = input.LA(1);

                if ( (LA30_0==OR) ) {
                    alt30=1;
                }


                switch (alt30) {
            	case 1 :
            	    // ES3.g3:1016:27: OR bitwiseXORExpression
            	    {
            	    OR104=(Token)match(input,OR,FOLLOW_OR_in_bitwiseORExpression4016); 
            	    OR104_tree = (Object)adaptor.create(OR104);
            	    root_0 = (Object)adaptor.becomeRoot(OR104_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseXORExpression_in_bitwiseORExpression4019);
            	    bitwiseXORExpression105=bitwiseXORExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseXORExpression105.getTree());

            	    }
            	    break;

            	default :
            	    break loop30;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseORExpression"

    public static class bitwiseORExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "bitwiseORExpressionNoIn"
    // ES3.g3:1019:1: bitwiseORExpressionNoIn : bitwiseXORExpressionNoIn ( OR bitwiseXORExpressionNoIn )* ;
    public final ES3Parser.bitwiseORExpressionNoIn_return bitwiseORExpressionNoIn() throws RecognitionException {
        ES3Parser.bitwiseORExpressionNoIn_return retval = new ES3Parser.bitwiseORExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token OR107=null;
        ES3Parser.bitwiseXORExpressionNoIn_return bitwiseXORExpressionNoIn106 = null;

        ES3Parser.bitwiseXORExpressionNoIn_return bitwiseXORExpressionNoIn108 = null;


        Object OR107_tree=null;

        try {
            // ES3.g3:1020:2: ( bitwiseXORExpressionNoIn ( OR bitwiseXORExpressionNoIn )* )
            // ES3.g3:1020:4: bitwiseXORExpressionNoIn ( OR bitwiseXORExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseXORExpressionNoIn_in_bitwiseORExpressionNoIn4034);
            bitwiseXORExpressionNoIn106=bitwiseXORExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseXORExpressionNoIn106.getTree());
            // ES3.g3:1020:29: ( OR bitwiseXORExpressionNoIn )*
            loop31:
            do {
                int alt31=2;
                int LA31_0 = input.LA(1);

                if ( (LA31_0==OR) ) {
                    alt31=1;
                }


                switch (alt31) {
            	case 1 :
            	    // ES3.g3:1020:31: OR bitwiseXORExpressionNoIn
            	    {
            	    OR107=(Token)match(input,OR,FOLLOW_OR_in_bitwiseORExpressionNoIn4038); 
            	    OR107_tree = (Object)adaptor.create(OR107);
            	    root_0 = (Object)adaptor.becomeRoot(OR107_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseXORExpressionNoIn_in_bitwiseORExpressionNoIn4041);
            	    bitwiseXORExpressionNoIn108=bitwiseXORExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseXORExpressionNoIn108.getTree());

            	    }
            	    break;

            	default :
            	    break loop31;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "bitwiseORExpressionNoIn"

    public static class logicalANDExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "logicalANDExpression"
    // ES3.g3:1027:1: logicalANDExpression : bitwiseORExpression ( LAND bitwiseORExpression )* ;
    public final ES3Parser.logicalANDExpression_return logicalANDExpression() throws RecognitionException {
        ES3Parser.logicalANDExpression_return retval = new ES3Parser.logicalANDExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LAND110=null;
        ES3Parser.bitwiseORExpression_return bitwiseORExpression109 = null;

        ES3Parser.bitwiseORExpression_return bitwiseORExpression111 = null;


        Object LAND110_tree=null;

        try {
            // ES3.g3:1028:2: ( bitwiseORExpression ( LAND bitwiseORExpression )* )
            // ES3.g3:1028:4: bitwiseORExpression ( LAND bitwiseORExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseORExpression_in_logicalANDExpression4060);
            bitwiseORExpression109=bitwiseORExpression();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseORExpression109.getTree());
            // ES3.g3:1028:24: ( LAND bitwiseORExpression )*
            loop32:
            do {
                int alt32=2;
                int LA32_0 = input.LA(1);

                if ( (LA32_0==LAND) ) {
                    alt32=1;
                }


                switch (alt32) {
            	case 1 :
            	    // ES3.g3:1028:26: LAND bitwiseORExpression
            	    {
            	    LAND110=(Token)match(input,LAND,FOLLOW_LAND_in_logicalANDExpression4064); 
            	    LAND110_tree = (Object)adaptor.create(LAND110);
            	    root_0 = (Object)adaptor.becomeRoot(LAND110_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseORExpression_in_logicalANDExpression4067);
            	    bitwiseORExpression111=bitwiseORExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseORExpression111.getTree());

            	    }
            	    break;

            	default :
            	    break loop32;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "logicalANDExpression"

    public static class logicalANDExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "logicalANDExpressionNoIn"
    // ES3.g3:1031:1: logicalANDExpressionNoIn : bitwiseORExpressionNoIn ( LAND bitwiseORExpressionNoIn )* ;
    public final ES3Parser.logicalANDExpressionNoIn_return logicalANDExpressionNoIn() throws RecognitionException {
        ES3Parser.logicalANDExpressionNoIn_return retval = new ES3Parser.logicalANDExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LAND113=null;
        ES3Parser.bitwiseORExpressionNoIn_return bitwiseORExpressionNoIn112 = null;

        ES3Parser.bitwiseORExpressionNoIn_return bitwiseORExpressionNoIn114 = null;


        Object LAND113_tree=null;

        try {
            // ES3.g3:1032:2: ( bitwiseORExpressionNoIn ( LAND bitwiseORExpressionNoIn )* )
            // ES3.g3:1032:4: bitwiseORExpressionNoIn ( LAND bitwiseORExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_bitwiseORExpressionNoIn_in_logicalANDExpressionNoIn4081);
            bitwiseORExpressionNoIn112=bitwiseORExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, bitwiseORExpressionNoIn112.getTree());
            // ES3.g3:1032:28: ( LAND bitwiseORExpressionNoIn )*
            loop33:
            do {
                int alt33=2;
                int LA33_0 = input.LA(1);

                if ( (LA33_0==LAND) ) {
                    alt33=1;
                }


                switch (alt33) {
            	case 1 :
            	    // ES3.g3:1032:30: LAND bitwiseORExpressionNoIn
            	    {
            	    LAND113=(Token)match(input,LAND,FOLLOW_LAND_in_logicalANDExpressionNoIn4085); 
            	    LAND113_tree = (Object)adaptor.create(LAND113);
            	    root_0 = (Object)adaptor.becomeRoot(LAND113_tree, root_0);

            	    pushFollow(FOLLOW_bitwiseORExpressionNoIn_in_logicalANDExpressionNoIn4088);
            	    bitwiseORExpressionNoIn114=bitwiseORExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, bitwiseORExpressionNoIn114.getTree());

            	    }
            	    break;

            	default :
            	    break loop33;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "logicalANDExpressionNoIn"

    public static class logicalORExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "logicalORExpression"
    // ES3.g3:1035:1: logicalORExpression : logicalANDExpression ( LOR logicalANDExpression )* ;
    public final ES3Parser.logicalORExpression_return logicalORExpression() throws RecognitionException {
        ES3Parser.logicalORExpression_return retval = new ES3Parser.logicalORExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LOR116=null;
        ES3Parser.logicalANDExpression_return logicalANDExpression115 = null;

        ES3Parser.logicalANDExpression_return logicalANDExpression117 = null;


        Object LOR116_tree=null;

        try {
            // ES3.g3:1036:2: ( logicalANDExpression ( LOR logicalANDExpression )* )
            // ES3.g3:1036:4: logicalANDExpression ( LOR logicalANDExpression )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_logicalANDExpression_in_logicalORExpression4103);
            logicalANDExpression115=logicalANDExpression();

            state._fsp--;

            adaptor.addChild(root_0, logicalANDExpression115.getTree());
            // ES3.g3:1036:25: ( LOR logicalANDExpression )*
            loop34:
            do {
                int alt34=2;
                int LA34_0 = input.LA(1);

                if ( (LA34_0==LOR) ) {
                    alt34=1;
                }


                switch (alt34) {
            	case 1 :
            	    // ES3.g3:1036:27: LOR logicalANDExpression
            	    {
            	    LOR116=(Token)match(input,LOR,FOLLOW_LOR_in_logicalORExpression4107); 
            	    LOR116_tree = (Object)adaptor.create(LOR116);
            	    root_0 = (Object)adaptor.becomeRoot(LOR116_tree, root_0);

            	    pushFollow(FOLLOW_logicalANDExpression_in_logicalORExpression4110);
            	    logicalANDExpression117=logicalANDExpression();

            	    state._fsp--;

            	    adaptor.addChild(root_0, logicalANDExpression117.getTree());

            	    }
            	    break;

            	default :
            	    break loop34;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "logicalORExpression"

    public static class logicalORExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "logicalORExpressionNoIn"
    // ES3.g3:1039:1: logicalORExpressionNoIn : logicalANDExpressionNoIn ( LOR logicalANDExpressionNoIn )* ;
    public final ES3Parser.logicalORExpressionNoIn_return logicalORExpressionNoIn() throws RecognitionException {
        ES3Parser.logicalORExpressionNoIn_return retval = new ES3Parser.logicalORExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LOR119=null;
        ES3Parser.logicalANDExpressionNoIn_return logicalANDExpressionNoIn118 = null;

        ES3Parser.logicalANDExpressionNoIn_return logicalANDExpressionNoIn120 = null;


        Object LOR119_tree=null;

        try {
            // ES3.g3:1040:2: ( logicalANDExpressionNoIn ( LOR logicalANDExpressionNoIn )* )
            // ES3.g3:1040:4: logicalANDExpressionNoIn ( LOR logicalANDExpressionNoIn )*
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_logicalANDExpressionNoIn_in_logicalORExpressionNoIn4125);
            logicalANDExpressionNoIn118=logicalANDExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, logicalANDExpressionNoIn118.getTree());
            // ES3.g3:1040:29: ( LOR logicalANDExpressionNoIn )*
            loop35:
            do {
                int alt35=2;
                int LA35_0 = input.LA(1);

                if ( (LA35_0==LOR) ) {
                    alt35=1;
                }


                switch (alt35) {
            	case 1 :
            	    // ES3.g3:1040:31: LOR logicalANDExpressionNoIn
            	    {
            	    LOR119=(Token)match(input,LOR,FOLLOW_LOR_in_logicalORExpressionNoIn4129); 
            	    LOR119_tree = (Object)adaptor.create(LOR119);
            	    root_0 = (Object)adaptor.becomeRoot(LOR119_tree, root_0);

            	    pushFollow(FOLLOW_logicalANDExpressionNoIn_in_logicalORExpressionNoIn4132);
            	    logicalANDExpressionNoIn120=logicalANDExpressionNoIn();

            	    state._fsp--;

            	    adaptor.addChild(root_0, logicalANDExpressionNoIn120.getTree());

            	    }
            	    break;

            	default :
            	    break loop35;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "logicalORExpressionNoIn"

    public static class conditionalExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "conditionalExpression"
    // ES3.g3:1047:1: conditionalExpression : logicalORExpression ( QUE assignmentExpression COLON assignmentExpression )? ;
    public final ES3Parser.conditionalExpression_return conditionalExpression() throws RecognitionException {
        ES3Parser.conditionalExpression_return retval = new ES3Parser.conditionalExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token QUE122=null;
        Token COLON124=null;
        ES3Parser.logicalORExpression_return logicalORExpression121 = null;

        ES3Parser.assignmentExpression_return assignmentExpression123 = null;

        ES3Parser.assignmentExpression_return assignmentExpression125 = null;


        Object QUE122_tree=null;
        Object COLON124_tree=null;

        try {
            // ES3.g3:1048:2: ( logicalORExpression ( QUE assignmentExpression COLON assignmentExpression )? )
            // ES3.g3:1048:4: logicalORExpression ( QUE assignmentExpression COLON assignmentExpression )?
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_logicalORExpression_in_conditionalExpression4151);
            logicalORExpression121=logicalORExpression();

            state._fsp--;

            adaptor.addChild(root_0, logicalORExpression121.getTree());
            // ES3.g3:1048:24: ( QUE assignmentExpression COLON assignmentExpression )?
            int alt36=2;
            int LA36_0 = input.LA(1);

            if ( (LA36_0==QUE) ) {
                alt36=1;
            }
            switch (alt36) {
                case 1 :
                    // ES3.g3:1048:26: QUE assignmentExpression COLON assignmentExpression
                    {
                    QUE122=(Token)match(input,QUE,FOLLOW_QUE_in_conditionalExpression4155); 
                    QUE122_tree = (Object)adaptor.create(QUE122);
                    root_0 = (Object)adaptor.becomeRoot(QUE122_tree, root_0);

                    pushFollow(FOLLOW_assignmentExpression_in_conditionalExpression4158);
                    assignmentExpression123=assignmentExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpression123.getTree());
                    COLON124=(Token)match(input,COLON,FOLLOW_COLON_in_conditionalExpression4160); 
                    pushFollow(FOLLOW_assignmentExpression_in_conditionalExpression4163);
                    assignmentExpression125=assignmentExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpression125.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "conditionalExpression"

    public static class conditionalExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "conditionalExpressionNoIn"
    // ES3.g3:1051:1: conditionalExpressionNoIn : logicalORExpressionNoIn ( QUE assignmentExpressionNoIn COLON assignmentExpressionNoIn )? ;
    public final ES3Parser.conditionalExpressionNoIn_return conditionalExpressionNoIn() throws RecognitionException {
        ES3Parser.conditionalExpressionNoIn_return retval = new ES3Parser.conditionalExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token QUE127=null;
        Token COLON129=null;
        ES3Parser.logicalORExpressionNoIn_return logicalORExpressionNoIn126 = null;

        ES3Parser.assignmentExpressionNoIn_return assignmentExpressionNoIn128 = null;

        ES3Parser.assignmentExpressionNoIn_return assignmentExpressionNoIn130 = null;


        Object QUE127_tree=null;
        Object COLON129_tree=null;

        try {
            // ES3.g3:1052:2: ( logicalORExpressionNoIn ( QUE assignmentExpressionNoIn COLON assignmentExpressionNoIn )? )
            // ES3.g3:1052:4: logicalORExpressionNoIn ( QUE assignmentExpressionNoIn COLON assignmentExpressionNoIn )?
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_logicalORExpressionNoIn_in_conditionalExpressionNoIn4177);
            logicalORExpressionNoIn126=logicalORExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, logicalORExpressionNoIn126.getTree());
            // ES3.g3:1052:28: ( QUE assignmentExpressionNoIn COLON assignmentExpressionNoIn )?
            int alt37=2;
            int LA37_0 = input.LA(1);

            if ( (LA37_0==QUE) ) {
                alt37=1;
            }
            switch (alt37) {
                case 1 :
                    // ES3.g3:1052:30: QUE assignmentExpressionNoIn COLON assignmentExpressionNoIn
                    {
                    QUE127=(Token)match(input,QUE,FOLLOW_QUE_in_conditionalExpressionNoIn4181); 
                    QUE127_tree = (Object)adaptor.create(QUE127);
                    root_0 = (Object)adaptor.becomeRoot(QUE127_tree, root_0);

                    pushFollow(FOLLOW_assignmentExpressionNoIn_in_conditionalExpressionNoIn4184);
                    assignmentExpressionNoIn128=assignmentExpressionNoIn();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpressionNoIn128.getTree());
                    COLON129=(Token)match(input,COLON,FOLLOW_COLON_in_conditionalExpressionNoIn4186); 
                    pushFollow(FOLLOW_assignmentExpressionNoIn_in_conditionalExpressionNoIn4189);
                    assignmentExpressionNoIn130=assignmentExpressionNoIn();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpressionNoIn130.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "conditionalExpressionNoIn"

    public static class assignmentExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "assignmentExpression"
    // ES3.g3:1081:1: assignmentExpression : lhs= conditionalExpression ({...}? assignmentOperator assignmentExpression )? ;
    public final ES3Parser.assignmentExpression_return assignmentExpression() throws RecognitionException {
        ES3Parser.assignmentExpression_return retval = new ES3Parser.assignmentExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.conditionalExpression_return lhs = null;

        ES3Parser.assignmentOperator_return assignmentOperator131 = null;

        ES3Parser.assignmentExpression_return assignmentExpression132 = null;




        	Object[] isLhs = new Object[1];

        try {
            // ES3.g3:1086:2: (lhs= conditionalExpression ({...}? assignmentOperator assignmentExpression )? )
            // ES3.g3:1086:4: lhs= conditionalExpression ({...}? assignmentOperator assignmentExpression )?
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_conditionalExpression_in_assignmentExpression4217);
            lhs=conditionalExpression();

            state._fsp--;

            adaptor.addChild(root_0, lhs.getTree());
            // ES3.g3:1087:2: ({...}? assignmentOperator assignmentExpression )?
            int alt38=2;
            int LA38_0 = input.LA(1);

            if ( ((LA38_0>=ASSIGN && LA38_0<=XORASS)||LA38_0==DIVASS) ) {
                int LA38_1 = input.LA(2);

                if ( (( isLeftHandSideAssign(lhs, isLhs) )) ) {
                    alt38=1;
                }
            }
            switch (alt38) {
                case 1 :
                    // ES3.g3:1087:4: {...}? assignmentOperator assignmentExpression
                    {
                    if ( !(( isLeftHandSideAssign(lhs, isLhs) )) ) {
                        throw new FailedPredicateException(input, "assignmentExpression", " isLeftHandSideAssign(lhs, isLhs) ");
                    }
                    pushFollow(FOLLOW_assignmentOperator_in_assignmentExpression4224);
                    assignmentOperator131=assignmentOperator();

                    state._fsp--;

                    root_0 = (Object)adaptor.becomeRoot(assignmentOperator131.getTree(), root_0);
                    pushFollow(FOLLOW_assignmentExpression_in_assignmentExpression4227);
                    assignmentExpression132=assignmentExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpression132.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "assignmentExpression"

    public static class assignmentOperator_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "assignmentOperator"
    // ES3.g3:1090:1: assignmentOperator : ( ASSIGN | MULASS | DIVASS | MODASS | ADDASS | SUBASS | SHLASS | SHRASS | SHUASS | ANDASS | XORASS | ORASS );
    public final ES3Parser.assignmentOperator_return assignmentOperator() throws RecognitionException {
        ES3Parser.assignmentOperator_return retval = new ES3Parser.assignmentOperator_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token set133=null;

        Object set133_tree=null;

        try {
            // ES3.g3:1091:2: ( ASSIGN | MULASS | DIVASS | MODASS | ADDASS | SUBASS | SHLASS | SHRASS | SHUASS | ANDASS | XORASS | ORASS )
            // ES3.g3:
            {
            root_0 = (Object)adaptor.nil();

            set133=(Token)input.LT(1);
            if ( (input.LA(1)>=ASSIGN && input.LA(1)<=XORASS)||input.LA(1)==DIVASS ) {
                input.consume();
                adaptor.addChild(root_0, (Object)adaptor.create(set133));
                state.errorRecovery=false;
            }
            else {
                MismatchedSetException mse = new MismatchedSetException(null,input);
                throw mse;
            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "assignmentOperator"

    public static class assignmentExpressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "assignmentExpressionNoIn"
    // ES3.g3:1094:1: assignmentExpressionNoIn : lhs= conditionalExpressionNoIn ({...}? assignmentOperator assignmentExpressionNoIn )? ;
    public final ES3Parser.assignmentExpressionNoIn_return assignmentExpressionNoIn() throws RecognitionException {
        ES3Parser.assignmentExpressionNoIn_return retval = new ES3Parser.assignmentExpressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.conditionalExpressionNoIn_return lhs = null;

        ES3Parser.assignmentOperator_return assignmentOperator134 = null;

        ES3Parser.assignmentExpressionNoIn_return assignmentExpressionNoIn135 = null;




        	Object[] isLhs = new Object[1];

        try {
            // ES3.g3:1099:2: (lhs= conditionalExpressionNoIn ({...}? assignmentOperator assignmentExpressionNoIn )? )
            // ES3.g3:1099:4: lhs= conditionalExpressionNoIn ({...}? assignmentOperator assignmentExpressionNoIn )?
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_conditionalExpressionNoIn_in_assignmentExpressionNoIn4304);
            lhs=conditionalExpressionNoIn();

            state._fsp--;

            adaptor.addChild(root_0, lhs.getTree());
            // ES3.g3:1100:2: ({...}? assignmentOperator assignmentExpressionNoIn )?
            int alt39=2;
            int LA39_0 = input.LA(1);

            if ( ((LA39_0>=ASSIGN && LA39_0<=XORASS)||LA39_0==DIVASS) ) {
                int LA39_1 = input.LA(2);

                if ( (( isLeftHandSideAssign(lhs, isLhs) )) ) {
                    alt39=1;
                }
            }
            switch (alt39) {
                case 1 :
                    // ES3.g3:1100:4: {...}? assignmentOperator assignmentExpressionNoIn
                    {
                    if ( !(( isLeftHandSideAssign(lhs, isLhs) )) ) {
                        throw new FailedPredicateException(input, "assignmentExpressionNoIn", " isLeftHandSideAssign(lhs, isLhs) ");
                    }
                    pushFollow(FOLLOW_assignmentOperator_in_assignmentExpressionNoIn4311);
                    assignmentOperator134=assignmentOperator();

                    state._fsp--;

                    root_0 = (Object)adaptor.becomeRoot(assignmentOperator134.getTree(), root_0);
                    pushFollow(FOLLOW_assignmentExpressionNoIn_in_assignmentExpressionNoIn4314);
                    assignmentExpressionNoIn135=assignmentExpressionNoIn();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpressionNoIn135.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "assignmentExpressionNoIn"

    public static class expression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "expression"
    // ES3.g3:1107:1: expression : exprs+= assignmentExpression ( COMMA exprs+= assignmentExpression )* -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ ) -> $exprs;
    public final ES3Parser.expression_return expression() throws RecognitionException {
        ES3Parser.expression_return retval = new ES3Parser.expression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token COMMA136=null;
        List list_exprs=null;
        RuleReturnScope exprs = null;
        Object COMMA136_tree=null;
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleSubtreeStream stream_assignmentExpression=new RewriteRuleSubtreeStream(adaptor,"rule assignmentExpression");
        try {
            // ES3.g3:1108:2: (exprs+= assignmentExpression ( COMMA exprs+= assignmentExpression )* -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ ) -> $exprs)
            // ES3.g3:1108:4: exprs+= assignmentExpression ( COMMA exprs+= assignmentExpression )*
            {
            pushFollow(FOLLOW_assignmentExpression_in_expression4336);
            exprs=assignmentExpression();

            state._fsp--;

            stream_assignmentExpression.add(exprs.getTree());
            if (list_exprs==null) list_exprs=new ArrayList();
            list_exprs.add(exprs.getTree());

            // ES3.g3:1108:32: ( COMMA exprs+= assignmentExpression )*
            loop40:
            do {
                int alt40=2;
                int LA40_0 = input.LA(1);

                if ( (LA40_0==COMMA) ) {
                    alt40=1;
                }


                switch (alt40) {
            	case 1 :
            	    // ES3.g3:1108:34: COMMA exprs+= assignmentExpression
            	    {
            	    COMMA136=(Token)match(input,COMMA,FOLLOW_COMMA_in_expression4340);  
            	    stream_COMMA.add(COMMA136);

            	    pushFollow(FOLLOW_assignmentExpression_in_expression4344);
            	    exprs=assignmentExpression();

            	    state._fsp--;

            	    stream_assignmentExpression.add(exprs.getTree());
            	    if (list_exprs==null) list_exprs=new ArrayList();
            	    list_exprs.add(exprs.getTree());


            	    }
            	    break;

            	default :
            	    break loop40;
                }
            } while (true);



            // AST REWRITE
            // elements: exprs, exprs
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: exprs
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
            RewriteRuleSubtreeStream stream_exprs=new RewriteRuleSubtreeStream(adaptor,"token exprs",list_exprs);
            root_0 = (Object)adaptor.nil();
            // 1109:2: -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ )
            if ( list_exprs.size() > 1 ) {
                // ES3.g3:1109:28: ^( CEXPR ( $exprs)+ )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(CEXPR, "CEXPR"), root_1);

                if ( !(stream_exprs.hasNext()) ) {
                    throw new RewriteEarlyExitException();
                }
                while ( stream_exprs.hasNext() ) {
                    adaptor.addChild(root_1, stream_exprs.nextTree());

                }
                stream_exprs.reset();

                adaptor.addChild(root_0, root_1);
                }

            }
            else // 1110:2: -> $exprs
            {
                adaptor.addChild(root_0, stream_exprs.nextTree());

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "expression"

    public static class expressionNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "expressionNoIn"
    // ES3.g3:1113:1: expressionNoIn : exprs+= assignmentExpressionNoIn ( COMMA exprs+= assignmentExpressionNoIn )* -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ ) -> $exprs;
    public final ES3Parser.expressionNoIn_return expressionNoIn() throws RecognitionException {
        ES3Parser.expressionNoIn_return retval = new ES3Parser.expressionNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token COMMA137=null;
        List list_exprs=null;
        RuleReturnScope exprs = null;
        Object COMMA137_tree=null;
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleSubtreeStream stream_assignmentExpressionNoIn=new RewriteRuleSubtreeStream(adaptor,"rule assignmentExpressionNoIn");
        try {
            // ES3.g3:1114:2: (exprs+= assignmentExpressionNoIn ( COMMA exprs+= assignmentExpressionNoIn )* -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ ) -> $exprs)
            // ES3.g3:1114:4: exprs+= assignmentExpressionNoIn ( COMMA exprs+= assignmentExpressionNoIn )*
            {
            pushFollow(FOLLOW_assignmentExpressionNoIn_in_expressionNoIn4381);
            exprs=assignmentExpressionNoIn();

            state._fsp--;

            stream_assignmentExpressionNoIn.add(exprs.getTree());
            if (list_exprs==null) list_exprs=new ArrayList();
            list_exprs.add(exprs.getTree());

            // ES3.g3:1114:36: ( COMMA exprs+= assignmentExpressionNoIn )*
            loop41:
            do {
                int alt41=2;
                int LA41_0 = input.LA(1);

                if ( (LA41_0==COMMA) ) {
                    alt41=1;
                }


                switch (alt41) {
            	case 1 :
            	    // ES3.g3:1114:38: COMMA exprs+= assignmentExpressionNoIn
            	    {
            	    COMMA137=(Token)match(input,COMMA,FOLLOW_COMMA_in_expressionNoIn4385);  
            	    stream_COMMA.add(COMMA137);

            	    pushFollow(FOLLOW_assignmentExpressionNoIn_in_expressionNoIn4389);
            	    exprs=assignmentExpressionNoIn();

            	    state._fsp--;

            	    stream_assignmentExpressionNoIn.add(exprs.getTree());
            	    if (list_exprs==null) list_exprs=new ArrayList();
            	    list_exprs.add(exprs.getTree());


            	    }
            	    break;

            	default :
            	    break loop41;
                }
            } while (true);



            // AST REWRITE
            // elements: exprs, exprs
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: exprs
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
            RewriteRuleSubtreeStream stream_exprs=new RewriteRuleSubtreeStream(adaptor,"token exprs",list_exprs);
            root_0 = (Object)adaptor.nil();
            // 1115:2: -> { $exprs.size() > 1 }? ^( CEXPR ( $exprs)+ )
            if ( list_exprs.size() > 1 ) {
                // ES3.g3:1115:28: ^( CEXPR ( $exprs)+ )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(CEXPR, "CEXPR"), root_1);

                if ( !(stream_exprs.hasNext()) ) {
                    throw new RewriteEarlyExitException();
                }
                while ( stream_exprs.hasNext() ) {
                    adaptor.addChild(root_1, stream_exprs.nextTree());

                }
                stream_exprs.reset();

                adaptor.addChild(root_0, root_1);
                }

            }
            else // 1116:2: -> $exprs
            {
                adaptor.addChild(root_0, stream_exprs.nextTree());

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "expressionNoIn"

    public static class semic_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "semic"
    // ES3.g3:1141:1: semic : ( SEMIC | EOF | RBRACE | EOL | MultiLineComment );
    public final ES3Parser.semic_return semic() throws RecognitionException {
        ES3Parser.semic_return retval = new ES3Parser.semic_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token SEMIC138=null;
        Token EOF139=null;
        Token RBRACE140=null;
        Token EOL141=null;
        Token MultiLineComment142=null;

        Object SEMIC138_tree=null;
        Object EOF139_tree=null;
        Object RBRACE140_tree=null;
        Object EOL141_tree=null;
        Object MultiLineComment142_tree=null;


        	// Mark current position so we can unconsume a RBRACE.
        	int marker = input.mark();
        	// Promote EOL if appropriate	
        	promoteEOL(retval);

        try {
            // ES3.g3:1149:2: ( SEMIC | EOF | RBRACE | EOL | MultiLineComment )
            int alt42=5;
            switch ( input.LA(1) ) {
            case SEMIC:
                {
                alt42=1;
                }
                break;
            case EOF:
                {
                alt42=2;
                }
                break;
            case RBRACE:
                {
                alt42=3;
                }
                break;
            case EOL:
                {
                alt42=4;
                }
                break;
            case MultiLineComment:
                {
                alt42=5;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 42, 0, input);

                throw nvae;
            }

            switch (alt42) {
                case 1 :
                    // ES3.g3:1149:4: SEMIC
                    {
                    root_0 = (Object)adaptor.nil();

                    SEMIC138=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_semic4440); 
                    SEMIC138_tree = (Object)adaptor.create(SEMIC138);
                    adaptor.addChild(root_0, SEMIC138_tree);


                    }
                    break;
                case 2 :
                    // ES3.g3:1150:4: EOF
                    {
                    root_0 = (Object)adaptor.nil();

                    EOF139=(Token)match(input,EOF,FOLLOW_EOF_in_semic4445); 
                    EOF139_tree = (Object)adaptor.create(EOF139);
                    adaptor.addChild(root_0, EOF139_tree);


                    }
                    break;
                case 3 :
                    // ES3.g3:1151:4: RBRACE
                    {
                    root_0 = (Object)adaptor.nil();

                    RBRACE140=(Token)match(input,RBRACE,FOLLOW_RBRACE_in_semic4450); 
                    RBRACE140_tree = (Object)adaptor.create(RBRACE140);
                    adaptor.addChild(root_0, RBRACE140_tree);

                     input.rewind(marker); 

                    }
                    break;
                case 4 :
                    // ES3.g3:1152:4: EOL
                    {
                    root_0 = (Object)adaptor.nil();

                    EOL141=(Token)match(input,EOL,FOLLOW_EOL_in_semic4457); 
                    EOL141_tree = (Object)adaptor.create(EOL141);
                    adaptor.addChild(root_0, EOL141_tree);


                    }
                    break;
                case 5 :
                    // ES3.g3:1152:10: MultiLineComment
                    {
                    root_0 = (Object)adaptor.nil();

                    MultiLineComment142=(Token)match(input,MultiLineComment,FOLLOW_MultiLineComment_in_semic4461); 
                    MultiLineComment142_tree = (Object)adaptor.create(MultiLineComment142);
                    adaptor.addChild(root_0, MultiLineComment142_tree);


                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "semic"

    public static class statement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "statement"
    // ES3.g3:1160:1: statement options {k=1; } : ({...}? block | statementTail );
    public final ES3Parser.statement_return statement() throws RecognitionException {
        ES3Parser.statement_return retval = new ES3Parser.statement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.block_return block143 = null;

        ES3Parser.statementTail_return statementTail144 = null;



        try {
            // ES3.g3:1165:2: ({...}? block | statementTail )
            int alt43=2;
            alt43 = dfa43.predict(input);
            switch (alt43) {
                case 1 :
                    // ES3.g3:1165:4: {...}? block
                    {
                    root_0 = (Object)adaptor.nil();

                    if ( !(( input.LA(1) == LBRACE )) ) {
                        throw new FailedPredicateException(input, "statement", " input.LA(1) == LBRACE ");
                    }
                    pushFollow(FOLLOW_block_in_statement4490);
                    block143=block();

                    state._fsp--;

                    adaptor.addChild(root_0, block143.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:1166:4: statementTail
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_statementTail_in_statement4495);
                    statementTail144=statementTail();

                    state._fsp--;

                    adaptor.addChild(root_0, statementTail144.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "statement"

    public static class statementTail_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "statementTail"
    // ES3.g3:1169:1: statementTail : ( variableStatement | emptyStatement | expressionStatement | ifStatement | iterationStatement | continueStatement | breakStatement | returnStatement | withStatement | labelledStatement | switchStatement | throwStatement | tryStatement );
    public final ES3Parser.statementTail_return statementTail() throws RecognitionException {
        ES3Parser.statementTail_return retval = new ES3Parser.statementTail_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.variableStatement_return variableStatement145 = null;

        ES3Parser.emptyStatement_return emptyStatement146 = null;

        ES3Parser.expressionStatement_return expressionStatement147 = null;

        ES3Parser.ifStatement_return ifStatement148 = null;

        ES3Parser.iterationStatement_return iterationStatement149 = null;

        ES3Parser.continueStatement_return continueStatement150 = null;

        ES3Parser.breakStatement_return breakStatement151 = null;

        ES3Parser.returnStatement_return returnStatement152 = null;

        ES3Parser.withStatement_return withStatement153 = null;

        ES3Parser.labelledStatement_return labelledStatement154 = null;

        ES3Parser.switchStatement_return switchStatement155 = null;

        ES3Parser.throwStatement_return throwStatement156 = null;

        ES3Parser.tryStatement_return tryStatement157 = null;



        try {
            // ES3.g3:1170:2: ( variableStatement | emptyStatement | expressionStatement | ifStatement | iterationStatement | continueStatement | breakStatement | returnStatement | withStatement | labelledStatement | switchStatement | throwStatement | tryStatement )
            int alt44=13;
            alt44 = dfa44.predict(input);
            switch (alt44) {
                case 1 :
                    // ES3.g3:1170:4: variableStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_variableStatement_in_statementTail4507);
                    variableStatement145=variableStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, variableStatement145.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:1171:4: emptyStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_emptyStatement_in_statementTail4512);
                    emptyStatement146=emptyStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, emptyStatement146.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:1172:4: expressionStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_expressionStatement_in_statementTail4517);
                    expressionStatement147=expressionStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, expressionStatement147.getTree());

                    }
                    break;
                case 4 :
                    // ES3.g3:1173:4: ifStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_ifStatement_in_statementTail4522);
                    ifStatement148=ifStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, ifStatement148.getTree());

                    }
                    break;
                case 5 :
                    // ES3.g3:1174:4: iterationStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_iterationStatement_in_statementTail4527);
                    iterationStatement149=iterationStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, iterationStatement149.getTree());

                    }
                    break;
                case 6 :
                    // ES3.g3:1175:4: continueStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_continueStatement_in_statementTail4532);
                    continueStatement150=continueStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, continueStatement150.getTree());

                    }
                    break;
                case 7 :
                    // ES3.g3:1176:4: breakStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_breakStatement_in_statementTail4537);
                    breakStatement151=breakStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, breakStatement151.getTree());

                    }
                    break;
                case 8 :
                    // ES3.g3:1177:4: returnStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_returnStatement_in_statementTail4542);
                    returnStatement152=returnStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, returnStatement152.getTree());

                    }
                    break;
                case 9 :
                    // ES3.g3:1178:4: withStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_withStatement_in_statementTail4547);
                    withStatement153=withStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, withStatement153.getTree());

                    }
                    break;
                case 10 :
                    // ES3.g3:1179:4: labelledStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_labelledStatement_in_statementTail4552);
                    labelledStatement154=labelledStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, labelledStatement154.getTree());

                    }
                    break;
                case 11 :
                    // ES3.g3:1180:4: switchStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_switchStatement_in_statementTail4557);
                    switchStatement155=switchStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, switchStatement155.getTree());

                    }
                    break;
                case 12 :
                    // ES3.g3:1181:4: throwStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_throwStatement_in_statementTail4562);
                    throwStatement156=throwStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, throwStatement156.getTree());

                    }
                    break;
                case 13 :
                    // ES3.g3:1182:4: tryStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_tryStatement_in_statementTail4567);
                    tryStatement157=tryStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, tryStatement157.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "statementTail"

    public static class block_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "block"
    // ES3.g3:1187:1: block : lb= LBRACE ( statement )* RBRACE -> ^( BLOCK[$lb, \"BLOCK\"] ( statement )* ) ;
    public final ES3Parser.block_return block() throws RecognitionException {
        ES3Parser.block_return retval = new ES3Parser.block_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token lb=null;
        Token RBRACE159=null;
        ES3Parser.statement_return statement158 = null;


        Object lb_tree=null;
        Object RBRACE159_tree=null;
        RewriteRuleTokenStream stream_RBRACE=new RewriteRuleTokenStream(adaptor,"token RBRACE");
        RewriteRuleTokenStream stream_LBRACE=new RewriteRuleTokenStream(adaptor,"token LBRACE");
        RewriteRuleSubtreeStream stream_statement=new RewriteRuleSubtreeStream(adaptor,"rule statement");
        try {
            // ES3.g3:1188:2: (lb= LBRACE ( statement )* RBRACE -> ^( BLOCK[$lb, \"BLOCK\"] ( statement )* ) )
            // ES3.g3:1188:4: lb= LBRACE ( statement )* RBRACE
            {
            lb=(Token)match(input,LBRACE,FOLLOW_LBRACE_in_block4582);  
            stream_LBRACE.add(lb);

            // ES3.g3:1188:14: ( statement )*
            loop45:
            do {
                int alt45=2;
                int LA45_0 = input.LA(1);

                if ( ((LA45_0>=NULL && LA45_0<=BREAK)||LA45_0==CONTINUE||(LA45_0>=DELETE && LA45_0<=DO)||(LA45_0>=FOR && LA45_0<=IF)||(LA45_0>=NEW && LA45_0<=WITH)||LA45_0==LBRACE||LA45_0==LPAREN||LA45_0==LBRACK||LA45_0==SEMIC||(LA45_0>=ADD && LA45_0<=SUB)||(LA45_0>=INC && LA45_0<=DEC)||(LA45_0>=NOT && LA45_0<=INV)||(LA45_0>=Identifier && LA45_0<=StringLiteral)||LA45_0==RegularExpressionLiteral||(LA45_0>=DecimalLiteral && LA45_0<=HexIntegerLiteral)) ) {
                    alt45=1;
                }


                switch (alt45) {
            	case 1 :
            	    // ES3.g3:1188:14: statement
            	    {
            	    pushFollow(FOLLOW_statement_in_block4584);
            	    statement158=statement();

            	    state._fsp--;

            	    stream_statement.add(statement158.getTree());

            	    }
            	    break;

            	default :
            	    break loop45;
                }
            } while (true);

            RBRACE159=(Token)match(input,RBRACE,FOLLOW_RBRACE_in_block4587);  
            stream_RBRACE.add(RBRACE159);



            // AST REWRITE
            // elements: statement
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1189:2: -> ^( BLOCK[$lb, \"BLOCK\"] ( statement )* )
            {
                // ES3.g3:1189:5: ^( BLOCK[$lb, \"BLOCK\"] ( statement )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(BLOCK, lb, "BLOCK"), root_1);

                // ES3.g3:1189:28: ( statement )*
                while ( stream_statement.hasNext() ) {
                    adaptor.addChild(root_1, stream_statement.nextTree());

                }
                stream_statement.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "block"

    public static class variableStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "variableStatement"
    // ES3.g3:1196:1: variableStatement : VAR variableDeclaration ( COMMA variableDeclaration )* semic -> ^( VAR ( variableDeclaration )+ ) ;
    public final ES3Parser.variableStatement_return variableStatement() throws RecognitionException {
        ES3Parser.variableStatement_return retval = new ES3Parser.variableStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token VAR160=null;
        Token COMMA162=null;
        ES3Parser.variableDeclaration_return variableDeclaration161 = null;

        ES3Parser.variableDeclaration_return variableDeclaration163 = null;

        ES3Parser.semic_return semic164 = null;


        Object VAR160_tree=null;
        Object COMMA162_tree=null;
        RewriteRuleTokenStream stream_VAR=new RewriteRuleTokenStream(adaptor,"token VAR");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleSubtreeStream stream_variableDeclaration=new RewriteRuleSubtreeStream(adaptor,"rule variableDeclaration");
        RewriteRuleSubtreeStream stream_semic=new RewriteRuleSubtreeStream(adaptor,"rule semic");
        try {
            // ES3.g3:1197:2: ( VAR variableDeclaration ( COMMA variableDeclaration )* semic -> ^( VAR ( variableDeclaration )+ ) )
            // ES3.g3:1197:4: VAR variableDeclaration ( COMMA variableDeclaration )* semic
            {
            VAR160=(Token)match(input,VAR,FOLLOW_VAR_in_variableStatement4616);  
            stream_VAR.add(VAR160);

            pushFollow(FOLLOW_variableDeclaration_in_variableStatement4618);
            variableDeclaration161=variableDeclaration();

            state._fsp--;

            stream_variableDeclaration.add(variableDeclaration161.getTree());
            // ES3.g3:1197:28: ( COMMA variableDeclaration )*
            loop46:
            do {
                int alt46=2;
                int LA46_0 = input.LA(1);

                if ( (LA46_0==COMMA) ) {
                    alt46=1;
                }


                switch (alt46) {
            	case 1 :
            	    // ES3.g3:1197:30: COMMA variableDeclaration
            	    {
            	    COMMA162=(Token)match(input,COMMA,FOLLOW_COMMA_in_variableStatement4622);  
            	    stream_COMMA.add(COMMA162);

            	    pushFollow(FOLLOW_variableDeclaration_in_variableStatement4624);
            	    variableDeclaration163=variableDeclaration();

            	    state._fsp--;

            	    stream_variableDeclaration.add(variableDeclaration163.getTree());

            	    }
            	    break;

            	default :
            	    break loop46;
                }
            } while (true);

            pushFollow(FOLLOW_semic_in_variableStatement4629);
            semic164=semic();

            state._fsp--;

            stream_semic.add(semic164.getTree());


            // AST REWRITE
            // elements: variableDeclaration, VAR
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1198:2: -> ^( VAR ( variableDeclaration )+ )
            {
                // ES3.g3:1198:5: ^( VAR ( variableDeclaration )+ )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_VAR.nextNode(), root_1);

                if ( !(stream_variableDeclaration.hasNext()) ) {
                    throw new RewriteEarlyExitException();
                }
                while ( stream_variableDeclaration.hasNext() ) {
                    adaptor.addChild(root_1, stream_variableDeclaration.nextTree());

                }
                stream_variableDeclaration.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "variableStatement"

    public static class variableDeclaration_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "variableDeclaration"
    // ES3.g3:1201:1: variableDeclaration : Identifier ( ASSIGN assignmentExpression )? ;
    public final ES3Parser.variableDeclaration_return variableDeclaration() throws RecognitionException {
        ES3Parser.variableDeclaration_return retval = new ES3Parser.variableDeclaration_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token Identifier165=null;
        Token ASSIGN166=null;
        ES3Parser.assignmentExpression_return assignmentExpression167 = null;


        Object Identifier165_tree=null;
        Object ASSIGN166_tree=null;

        try {
            // ES3.g3:1202:2: ( Identifier ( ASSIGN assignmentExpression )? )
            // ES3.g3:1202:4: Identifier ( ASSIGN assignmentExpression )?
            {
            root_0 = (Object)adaptor.nil();

            Identifier165=(Token)match(input,Identifier,FOLLOW_Identifier_in_variableDeclaration4652); 
            Identifier165_tree = (Object)adaptor.create(Identifier165);
            adaptor.addChild(root_0, Identifier165_tree);

            // ES3.g3:1202:15: ( ASSIGN assignmentExpression )?
            int alt47=2;
            int LA47_0 = input.LA(1);

            if ( (LA47_0==ASSIGN) ) {
                alt47=1;
            }
            switch (alt47) {
                case 1 :
                    // ES3.g3:1202:17: ASSIGN assignmentExpression
                    {
                    ASSIGN166=(Token)match(input,ASSIGN,FOLLOW_ASSIGN_in_variableDeclaration4656); 
                    ASSIGN166_tree = (Object)adaptor.create(ASSIGN166);
                    root_0 = (Object)adaptor.becomeRoot(ASSIGN166_tree, root_0);

                    pushFollow(FOLLOW_assignmentExpression_in_variableDeclaration4659);
                    assignmentExpression167=assignmentExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpression167.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "variableDeclaration"

    public static class variableDeclarationNoIn_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "variableDeclarationNoIn"
    // ES3.g3:1205:1: variableDeclarationNoIn : Identifier ( ASSIGN assignmentExpressionNoIn )? ;
    public final ES3Parser.variableDeclarationNoIn_return variableDeclarationNoIn() throws RecognitionException {
        ES3Parser.variableDeclarationNoIn_return retval = new ES3Parser.variableDeclarationNoIn_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token Identifier168=null;
        Token ASSIGN169=null;
        ES3Parser.assignmentExpressionNoIn_return assignmentExpressionNoIn170 = null;


        Object Identifier168_tree=null;
        Object ASSIGN169_tree=null;

        try {
            // ES3.g3:1206:2: ( Identifier ( ASSIGN assignmentExpressionNoIn )? )
            // ES3.g3:1206:4: Identifier ( ASSIGN assignmentExpressionNoIn )?
            {
            root_0 = (Object)adaptor.nil();

            Identifier168=(Token)match(input,Identifier,FOLLOW_Identifier_in_variableDeclarationNoIn4674); 
            Identifier168_tree = (Object)adaptor.create(Identifier168);
            adaptor.addChild(root_0, Identifier168_tree);

            // ES3.g3:1206:15: ( ASSIGN assignmentExpressionNoIn )?
            int alt48=2;
            int LA48_0 = input.LA(1);

            if ( (LA48_0==ASSIGN) ) {
                alt48=1;
            }
            switch (alt48) {
                case 1 :
                    // ES3.g3:1206:17: ASSIGN assignmentExpressionNoIn
                    {
                    ASSIGN169=(Token)match(input,ASSIGN,FOLLOW_ASSIGN_in_variableDeclarationNoIn4678); 
                    ASSIGN169_tree = (Object)adaptor.create(ASSIGN169);
                    root_0 = (Object)adaptor.becomeRoot(ASSIGN169_tree, root_0);

                    pushFollow(FOLLOW_assignmentExpressionNoIn_in_variableDeclarationNoIn4681);
                    assignmentExpressionNoIn170=assignmentExpressionNoIn();

                    state._fsp--;

                    adaptor.addChild(root_0, assignmentExpressionNoIn170.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "variableDeclarationNoIn"

    public static class emptyStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "emptyStatement"
    // ES3.g3:1213:1: emptyStatement : SEMIC ;
    public final ES3Parser.emptyStatement_return emptyStatement() throws RecognitionException {
        ES3Parser.emptyStatement_return retval = new ES3Parser.emptyStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token SEMIC171=null;

        Object SEMIC171_tree=null;

        try {
            // ES3.g3:1214:2: ( SEMIC )
            // ES3.g3:1214:4: SEMIC
            {
            root_0 = (Object)adaptor.nil();

            SEMIC171=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_emptyStatement4700); 

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "emptyStatement"

    public static class expressionStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "expressionStatement"
    // ES3.g3:1227:1: expressionStatement : expression semic ;
    public final ES3Parser.expressionStatement_return expressionStatement() throws RecognitionException {
        ES3Parser.expressionStatement_return retval = new ES3Parser.expressionStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.expression_return expression172 = null;

        ES3Parser.semic_return semic173 = null;



        try {
            // ES3.g3:1228:2: ( expression semic )
            // ES3.g3:1228:4: expression semic
            {
            root_0 = (Object)adaptor.nil();

            pushFollow(FOLLOW_expression_in_expressionStatement4719);
            expression172=expression();

            state._fsp--;

            adaptor.addChild(root_0, expression172.getTree());
            pushFollow(FOLLOW_semic_in_expressionStatement4721);
            semic173=semic();

            state._fsp--;


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "expressionStatement"

    public static class ifStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "ifStatement"
    // ES3.g3:1235:1: ifStatement : IF LPAREN expression RPAREN statement ({...}? ELSE statement )? -> ^( IF expression ( statement )+ ) ;
    public final ES3Parser.ifStatement_return ifStatement() throws RecognitionException {
        ES3Parser.ifStatement_return retval = new ES3Parser.ifStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token IF174=null;
        Token LPAREN175=null;
        Token RPAREN177=null;
        Token ELSE179=null;
        ES3Parser.expression_return expression176 = null;

        ES3Parser.statement_return statement178 = null;

        ES3Parser.statement_return statement180 = null;


        Object IF174_tree=null;
        Object LPAREN175_tree=null;
        Object RPAREN177_tree=null;
        Object ELSE179_tree=null;
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");
        RewriteRuleTokenStream stream_IF=new RewriteRuleTokenStream(adaptor,"token IF");
        RewriteRuleTokenStream stream_ELSE=new RewriteRuleTokenStream(adaptor,"token ELSE");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_statement=new RewriteRuleSubtreeStream(adaptor,"rule statement");
        try {
            // ES3.g3:1237:2: ( IF LPAREN expression RPAREN statement ({...}? ELSE statement )? -> ^( IF expression ( statement )+ ) )
            // ES3.g3:1237:4: IF LPAREN expression RPAREN statement ({...}? ELSE statement )?
            {
            IF174=(Token)match(input,IF,FOLLOW_IF_in_ifStatement4739);  
            stream_IF.add(IF174);

            LPAREN175=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_ifStatement4741);  
            stream_LPAREN.add(LPAREN175);

            pushFollow(FOLLOW_expression_in_ifStatement4743);
            expression176=expression();

            state._fsp--;

            stream_expression.add(expression176.getTree());
            RPAREN177=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_ifStatement4745);  
            stream_RPAREN.add(RPAREN177);

            pushFollow(FOLLOW_statement_in_ifStatement4747);
            statement178=statement();

            state._fsp--;

            stream_statement.add(statement178.getTree());
            // ES3.g3:1237:42: ({...}? ELSE statement )?
            int alt49=2;
            int LA49_0 = input.LA(1);

            if ( (LA49_0==ELSE) ) {
                int LA49_1 = input.LA(2);

                if ( (( input.LA(1) == ELSE )) ) {
                    alt49=1;
                }
            }
            switch (alt49) {
                case 1 :
                    // ES3.g3:1237:44: {...}? ELSE statement
                    {
                    if ( !(( input.LA(1) == ELSE )) ) {
                        throw new FailedPredicateException(input, "ifStatement", " input.LA(1) == ELSE ");
                    }
                    ELSE179=(Token)match(input,ELSE,FOLLOW_ELSE_in_ifStatement4753);  
                    stream_ELSE.add(ELSE179);

                    pushFollow(FOLLOW_statement_in_ifStatement4755);
                    statement180=statement();

                    state._fsp--;

                    stream_statement.add(statement180.getTree());

                    }
                    break;

            }



            // AST REWRITE
            // elements: IF, statement, expression
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1238:2: -> ^( IF expression ( statement )+ )
            {
                // ES3.g3:1238:5: ^( IF expression ( statement )+ )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_IF.nextNode(), root_1);

                adaptor.addChild(root_1, stream_expression.nextTree());
                if ( !(stream_statement.hasNext()) ) {
                    throw new RewriteEarlyExitException();
                }
                while ( stream_statement.hasNext() ) {
                    adaptor.addChild(root_1, stream_statement.nextTree());

                }
                stream_statement.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "ifStatement"

    public static class iterationStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "iterationStatement"
    // ES3.g3:1245:1: iterationStatement : ( doStatement | whileStatement | forStatement );
    public final ES3Parser.iterationStatement_return iterationStatement() throws RecognitionException {
        ES3Parser.iterationStatement_return retval = new ES3Parser.iterationStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.doStatement_return doStatement181 = null;

        ES3Parser.whileStatement_return whileStatement182 = null;

        ES3Parser.forStatement_return forStatement183 = null;



        try {
            // ES3.g3:1246:2: ( doStatement | whileStatement | forStatement )
            int alt50=3;
            switch ( input.LA(1) ) {
            case DO:
                {
                alt50=1;
                }
                break;
            case WHILE:
                {
                alt50=2;
                }
                break;
            case FOR:
                {
                alt50=3;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 50, 0, input);

                throw nvae;
            }

            switch (alt50) {
                case 1 :
                    // ES3.g3:1246:4: doStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_doStatement_in_iterationStatement4788);
                    doStatement181=doStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, doStatement181.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:1247:4: whileStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_whileStatement_in_iterationStatement4793);
                    whileStatement182=whileStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, whileStatement182.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:1248:4: forStatement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_forStatement_in_iterationStatement4798);
                    forStatement183=forStatement();

                    state._fsp--;

                    adaptor.addChild(root_0, forStatement183.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "iterationStatement"

    public static class doStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "doStatement"
    // ES3.g3:1251:1: doStatement : DO statement WHILE LPAREN expression RPAREN semic -> ^( DO statement expression ) ;
    public final ES3Parser.doStatement_return doStatement() throws RecognitionException {
        ES3Parser.doStatement_return retval = new ES3Parser.doStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token DO184=null;
        Token WHILE186=null;
        Token LPAREN187=null;
        Token RPAREN189=null;
        ES3Parser.statement_return statement185 = null;

        ES3Parser.expression_return expression188 = null;

        ES3Parser.semic_return semic190 = null;


        Object DO184_tree=null;
        Object WHILE186_tree=null;
        Object LPAREN187_tree=null;
        Object RPAREN189_tree=null;
        RewriteRuleTokenStream stream_DO=new RewriteRuleTokenStream(adaptor,"token DO");
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_WHILE=new RewriteRuleTokenStream(adaptor,"token WHILE");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");
        RewriteRuleSubtreeStream stream_statement=new RewriteRuleSubtreeStream(adaptor,"rule statement");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_semic=new RewriteRuleSubtreeStream(adaptor,"rule semic");
        try {
            // ES3.g3:1252:2: ( DO statement WHILE LPAREN expression RPAREN semic -> ^( DO statement expression ) )
            // ES3.g3:1252:4: DO statement WHILE LPAREN expression RPAREN semic
            {
            DO184=(Token)match(input,DO,FOLLOW_DO_in_doStatement4810);  
            stream_DO.add(DO184);

            pushFollow(FOLLOW_statement_in_doStatement4812);
            statement185=statement();

            state._fsp--;

            stream_statement.add(statement185.getTree());
            WHILE186=(Token)match(input,WHILE,FOLLOW_WHILE_in_doStatement4814);  
            stream_WHILE.add(WHILE186);

            LPAREN187=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_doStatement4816);  
            stream_LPAREN.add(LPAREN187);

            pushFollow(FOLLOW_expression_in_doStatement4818);
            expression188=expression();

            state._fsp--;

            stream_expression.add(expression188.getTree());
            RPAREN189=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_doStatement4820);  
            stream_RPAREN.add(RPAREN189);

            pushFollow(FOLLOW_semic_in_doStatement4822);
            semic190=semic();

            state._fsp--;

            stream_semic.add(semic190.getTree());


            // AST REWRITE
            // elements: statement, expression, DO
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1253:2: -> ^( DO statement expression )
            {
                // ES3.g3:1253:5: ^( DO statement expression )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_DO.nextNode(), root_1);

                adaptor.addChild(root_1, stream_statement.nextTree());
                adaptor.addChild(root_1, stream_expression.nextTree());

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "doStatement"

    public static class whileStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "whileStatement"
    // ES3.g3:1256:1: whileStatement : WHILE LPAREN expression RPAREN statement ;
    public final ES3Parser.whileStatement_return whileStatement() throws RecognitionException {
        ES3Parser.whileStatement_return retval = new ES3Parser.whileStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token WHILE191=null;
        Token LPAREN192=null;
        Token RPAREN194=null;
        ES3Parser.expression_return expression193 = null;

        ES3Parser.statement_return statement195 = null;


        Object WHILE191_tree=null;
        Object LPAREN192_tree=null;
        Object RPAREN194_tree=null;

        try {
            // ES3.g3:1257:2: ( WHILE LPAREN expression RPAREN statement )
            // ES3.g3:1257:4: WHILE LPAREN expression RPAREN statement
            {
            root_0 = (Object)adaptor.nil();

            WHILE191=(Token)match(input,WHILE,FOLLOW_WHILE_in_whileStatement4847); 
            WHILE191_tree = (Object)adaptor.create(WHILE191);
            root_0 = (Object)adaptor.becomeRoot(WHILE191_tree, root_0);

            LPAREN192=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_whileStatement4850); 
            pushFollow(FOLLOW_expression_in_whileStatement4853);
            expression193=expression();

            state._fsp--;

            adaptor.addChild(root_0, expression193.getTree());
            RPAREN194=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_whileStatement4855); 
            pushFollow(FOLLOW_statement_in_whileStatement4858);
            statement195=statement();

            state._fsp--;

            adaptor.addChild(root_0, statement195.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "whileStatement"

    public static class forStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "forStatement"
    // ES3.g3:1301:1: forStatement : FOR LPAREN forControl RPAREN statement ;
    public final ES3Parser.forStatement_return forStatement() throws RecognitionException {
        ES3Parser.forStatement_return retval = new ES3Parser.forStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token FOR196=null;
        Token LPAREN197=null;
        Token RPAREN199=null;
        ES3Parser.forControl_return forControl198 = null;

        ES3Parser.statement_return statement200 = null;


        Object FOR196_tree=null;
        Object LPAREN197_tree=null;
        Object RPAREN199_tree=null;

        try {
            // ES3.g3:1302:2: ( FOR LPAREN forControl RPAREN statement )
            // ES3.g3:1302:4: FOR LPAREN forControl RPAREN statement
            {
            root_0 = (Object)adaptor.nil();

            FOR196=(Token)match(input,FOR,FOLLOW_FOR_in_forStatement4871); 
            FOR196_tree = (Object)adaptor.create(FOR196);
            root_0 = (Object)adaptor.becomeRoot(FOR196_tree, root_0);

            LPAREN197=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_forStatement4874); 
            pushFollow(FOLLOW_forControl_in_forStatement4877);
            forControl198=forControl();

            state._fsp--;

            adaptor.addChild(root_0, forControl198.getTree());
            RPAREN199=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_forStatement4879); 
            pushFollow(FOLLOW_statement_in_forStatement4882);
            statement200=statement();

            state._fsp--;

            adaptor.addChild(root_0, statement200.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "forStatement"

    public static class forControl_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "forControl"
    // ES3.g3:1305:1: forControl : ( forControlVar | forControlExpression | forControlSemic );
    public final ES3Parser.forControl_return forControl() throws RecognitionException {
        ES3Parser.forControl_return retval = new ES3Parser.forControl_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.forControlVar_return forControlVar201 = null;

        ES3Parser.forControlExpression_return forControlExpression202 = null;

        ES3Parser.forControlSemic_return forControlSemic203 = null;



        try {
            // ES3.g3:1306:2: ( forControlVar | forControlExpression | forControlSemic )
            int alt51=3;
            switch ( input.LA(1) ) {
            case VAR:
                {
                alt51=1;
                }
                break;
            case NULL:
            case TRUE:
            case FALSE:
            case DELETE:
            case FUNCTION:
            case NEW:
            case THIS:
            case TYPEOF:
            case VOID:
            case LBRACE:
            case LPAREN:
            case LBRACK:
            case ADD:
            case SUB:
            case INC:
            case DEC:
            case NOT:
            case INV:
            case Identifier:
            case StringLiteral:
            case RegularExpressionLiteral:
            case DecimalLiteral:
            case OctalIntegerLiteral:
            case HexIntegerLiteral:
                {
                alt51=2;
                }
                break;
            case SEMIC:
                {
                alt51=3;
                }
                break;
            default:
                NoViableAltException nvae =
                    new NoViableAltException("", 51, 0, input);

                throw nvae;
            }

            switch (alt51) {
                case 1 :
                    // ES3.g3:1306:4: forControlVar
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_forControlVar_in_forControl4893);
                    forControlVar201=forControlVar();

                    state._fsp--;

                    adaptor.addChild(root_0, forControlVar201.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:1307:4: forControlExpression
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_forControlExpression_in_forControl4898);
                    forControlExpression202=forControlExpression();

                    state._fsp--;

                    adaptor.addChild(root_0, forControlExpression202.getTree());

                    }
                    break;
                case 3 :
                    // ES3.g3:1308:4: forControlSemic
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_forControlSemic_in_forControl4903);
                    forControlSemic203=forControlSemic();

                    state._fsp--;

                    adaptor.addChild(root_0, forControlSemic203.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "forControl"

    public static class forControlVar_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "forControlVar"
    // ES3.g3:1311:1: forControlVar : VAR variableDeclarationNoIn ( ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) ) | ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) ) ) ;
    public final ES3Parser.forControlVar_return forControlVar() throws RecognitionException {
        ES3Parser.forControlVar_return retval = new ES3Parser.forControlVar_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token VAR204=null;
        Token IN206=null;
        Token COMMA208=null;
        Token SEMIC210=null;
        Token SEMIC211=null;
        ES3Parser.expression_return ex1 = null;

        ES3Parser.expression_return ex2 = null;

        ES3Parser.variableDeclarationNoIn_return variableDeclarationNoIn205 = null;

        ES3Parser.expression_return expression207 = null;

        ES3Parser.variableDeclarationNoIn_return variableDeclarationNoIn209 = null;


        Object VAR204_tree=null;
        Object IN206_tree=null;
        Object COMMA208_tree=null;
        Object SEMIC210_tree=null;
        Object SEMIC211_tree=null;
        RewriteRuleTokenStream stream_VAR=new RewriteRuleTokenStream(adaptor,"token VAR");
        RewriteRuleTokenStream stream_IN=new RewriteRuleTokenStream(adaptor,"token IN");
        RewriteRuleTokenStream stream_SEMIC=new RewriteRuleTokenStream(adaptor,"token SEMIC");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_variableDeclarationNoIn=new RewriteRuleSubtreeStream(adaptor,"rule variableDeclarationNoIn");
        try {
            // ES3.g3:1312:2: ( VAR variableDeclarationNoIn ( ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) ) | ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) ) ) )
            // ES3.g3:1312:4: VAR variableDeclarationNoIn ( ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) ) | ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) ) )
            {
            VAR204=(Token)match(input,VAR,FOLLOW_VAR_in_forControlVar4914);  
            stream_VAR.add(VAR204);

            pushFollow(FOLLOW_variableDeclarationNoIn_in_forControlVar4916);
            variableDeclarationNoIn205=variableDeclarationNoIn();

            state._fsp--;

            stream_variableDeclarationNoIn.add(variableDeclarationNoIn205.getTree());
            // ES3.g3:1313:2: ( ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) ) | ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) ) )
            int alt55=2;
            int LA55_0 = input.LA(1);

            if ( (LA55_0==IN) ) {
                alt55=1;
            }
            else if ( ((LA55_0>=SEMIC && LA55_0<=COMMA)) ) {
                alt55=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 55, 0, input);

                throw nvae;
            }
            switch (alt55) {
                case 1 :
                    // ES3.g3:1314:3: ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) )
                    {
                    // ES3.g3:1314:3: ( IN expression -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) ) )
                    // ES3.g3:1315:4: IN expression
                    {
                    IN206=(Token)match(input,IN,FOLLOW_IN_in_forControlVar4928);  
                    stream_IN.add(IN206);

                    pushFollow(FOLLOW_expression_in_forControlVar4930);
                    expression207=expression();

                    state._fsp--;

                    stream_expression.add(expression207.getTree());


                    // AST REWRITE
                    // elements: expression, variableDeclarationNoIn, VAR
                    // token labels: 
                    // rule labels: retval
                    // token list labels: 
                    // rule list labels: 
                    // wildcard labels: 
                    retval.tree = root_0;
                    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

                    root_0 = (Object)adaptor.nil();
                    // 1316:4: -> ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) )
                    {
                        // ES3.g3:1316:7: ^( FORITER ^( VAR variableDeclarationNoIn ) ^( EXPR expression ) )
                        {
                        Object root_1 = (Object)adaptor.nil();
                        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(FORITER, "FORITER"), root_1);

                        // ES3.g3:1316:18: ^( VAR variableDeclarationNoIn )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot(stream_VAR.nextNode(), root_2);

                        adaptor.addChild(root_2, stream_variableDeclarationNoIn.nextTree());

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1316:51: ^( EXPR expression )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        adaptor.addChild(root_2, stream_expression.nextTree());

                        adaptor.addChild(root_1, root_2);
                        }

                        adaptor.addChild(root_0, root_1);
                        }

                    }

                    retval.tree = root_0;
                    }


                    }
                    break;
                case 2 :
                    // ES3.g3:1319:3: ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) )
                    {
                    // ES3.g3:1319:3: ( ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) )
                    // ES3.g3:1320:4: ( COMMA variableDeclarationNoIn )* SEMIC (ex1= expression )? SEMIC (ex2= expression )?
                    {
                    // ES3.g3:1320:4: ( COMMA variableDeclarationNoIn )*
                    loop52:
                    do {
                        int alt52=2;
                        int LA52_0 = input.LA(1);

                        if ( (LA52_0==COMMA) ) {
                            alt52=1;
                        }


                        switch (alt52) {
                    	case 1 :
                    	    // ES3.g3:1320:6: COMMA variableDeclarationNoIn
                    	    {
                    	    COMMA208=(Token)match(input,COMMA,FOLLOW_COMMA_in_forControlVar4976);  
                    	    stream_COMMA.add(COMMA208);

                    	    pushFollow(FOLLOW_variableDeclarationNoIn_in_forControlVar4978);
                    	    variableDeclarationNoIn209=variableDeclarationNoIn();

                    	    state._fsp--;

                    	    stream_variableDeclarationNoIn.add(variableDeclarationNoIn209.getTree());

                    	    }
                    	    break;

                    	default :
                    	    break loop52;
                        }
                    } while (true);

                    SEMIC210=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlVar4983);  
                    stream_SEMIC.add(SEMIC210);

                    // ES3.g3:1320:48: (ex1= expression )?
                    int alt53=2;
                    int LA53_0 = input.LA(1);

                    if ( ((LA53_0>=NULL && LA53_0<=FALSE)||LA53_0==DELETE||LA53_0==FUNCTION||LA53_0==NEW||LA53_0==THIS||LA53_0==TYPEOF||LA53_0==VOID||LA53_0==LBRACE||LA53_0==LPAREN||LA53_0==LBRACK||(LA53_0>=ADD && LA53_0<=SUB)||(LA53_0>=INC && LA53_0<=DEC)||(LA53_0>=NOT && LA53_0<=INV)||(LA53_0>=Identifier && LA53_0<=StringLiteral)||LA53_0==RegularExpressionLiteral||(LA53_0>=DecimalLiteral && LA53_0<=HexIntegerLiteral)) ) {
                        alt53=1;
                    }
                    switch (alt53) {
                        case 1 :
                            // ES3.g3:1320:48: ex1= expression
                            {
                            pushFollow(FOLLOW_expression_in_forControlVar4987);
                            ex1=expression();

                            state._fsp--;

                            stream_expression.add(ex1.getTree());

                            }
                            break;

                    }

                    SEMIC211=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlVar4990);  
                    stream_SEMIC.add(SEMIC211);

                    // ES3.g3:1320:70: (ex2= expression )?
                    int alt54=2;
                    int LA54_0 = input.LA(1);

                    if ( ((LA54_0>=NULL && LA54_0<=FALSE)||LA54_0==DELETE||LA54_0==FUNCTION||LA54_0==NEW||LA54_0==THIS||LA54_0==TYPEOF||LA54_0==VOID||LA54_0==LBRACE||LA54_0==LPAREN||LA54_0==LBRACK||(LA54_0>=ADD && LA54_0<=SUB)||(LA54_0>=INC && LA54_0<=DEC)||(LA54_0>=NOT && LA54_0<=INV)||(LA54_0>=Identifier && LA54_0<=StringLiteral)||LA54_0==RegularExpressionLiteral||(LA54_0>=DecimalLiteral && LA54_0<=HexIntegerLiteral)) ) {
                        alt54=1;
                    }
                    switch (alt54) {
                        case 1 :
                            // ES3.g3:1320:70: ex2= expression
                            {
                            pushFollow(FOLLOW_expression_in_forControlVar4994);
                            ex2=expression();

                            state._fsp--;

                            stream_expression.add(ex2.getTree());

                            }
                            break;

                    }



                    // AST REWRITE
                    // elements: VAR, ex1, ex2, variableDeclarationNoIn
                    // token labels: 
                    // rule labels: retval, ex2, ex1
                    // token list labels: 
                    // rule list labels: 
                    // wildcard labels: 
                    retval.tree = root_0;
                    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
                    RewriteRuleSubtreeStream stream_ex2=new RewriteRuleSubtreeStream(adaptor,"rule ex2",ex2!=null?ex2.tree:null);
                    RewriteRuleSubtreeStream stream_ex1=new RewriteRuleSubtreeStream(adaptor,"rule ex1",ex1!=null?ex1.tree:null);

                    root_0 = (Object)adaptor.nil();
                    // 1321:4: -> ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) )
                    {
                        // ES3.g3:1321:7: ^( FORSTEP ^( VAR ( variableDeclarationNoIn )+ ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) )
                        {
                        Object root_1 = (Object)adaptor.nil();
                        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(FORSTEP, "FORSTEP"), root_1);

                        // ES3.g3:1321:18: ^( VAR ( variableDeclarationNoIn )+ )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot(stream_VAR.nextNode(), root_2);

                        if ( !(stream_variableDeclarationNoIn.hasNext()) ) {
                            throw new RewriteEarlyExitException();
                        }
                        while ( stream_variableDeclarationNoIn.hasNext() ) {
                            adaptor.addChild(root_2, stream_variableDeclarationNoIn.nextTree());

                        }
                        stream_variableDeclarationNoIn.reset();

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1321:52: ^( EXPR ( $ex1)? )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        // ES3.g3:1321:60: ( $ex1)?
                        if ( stream_ex1.hasNext() ) {
                            adaptor.addChild(root_2, stream_ex1.nextTree());

                        }
                        stream_ex1.reset();

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1321:68: ^( EXPR ( $ex2)? )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        // ES3.g3:1321:76: ( $ex2)?
                        if ( stream_ex2.hasNext() ) {
                            adaptor.addChild(root_2, stream_ex2.nextTree());

                        }
                        stream_ex2.reset();

                        adaptor.addChild(root_1, root_2);
                        }

                        adaptor.addChild(root_0, root_1);
                        }

                    }

                    retval.tree = root_0;
                    }


                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "forControlVar"

    public static class forControlExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "forControlExpression"
    // ES3.g3:1326:1: forControlExpression : ex1= expressionNoIn ({...}? ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) ) | ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) ) ) ;
    public final ES3Parser.forControlExpression_return forControlExpression() throws RecognitionException {
        ES3Parser.forControlExpression_return retval = new ES3Parser.forControlExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token IN212=null;
        Token SEMIC213=null;
        Token SEMIC214=null;
        ES3Parser.expressionNoIn_return ex1 = null;

        ES3Parser.expression_return ex2 = null;

        ES3Parser.expression_return ex3 = null;


        Object IN212_tree=null;
        Object SEMIC213_tree=null;
        Object SEMIC214_tree=null;
        RewriteRuleTokenStream stream_IN=new RewriteRuleTokenStream(adaptor,"token IN");
        RewriteRuleTokenStream stream_SEMIC=new RewriteRuleTokenStream(adaptor,"token SEMIC");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_expressionNoIn=new RewriteRuleSubtreeStream(adaptor,"rule expressionNoIn");

        	Object[] isLhs = new Object[1];

        try {
            // ES3.g3:1331:2: (ex1= expressionNoIn ({...}? ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) ) | ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) ) ) )
            // ES3.g3:1331:4: ex1= expressionNoIn ({...}? ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) ) | ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) ) )
            {
            pushFollow(FOLLOW_expressionNoIn_in_forControlExpression5060);
            ex1=expressionNoIn();

            state._fsp--;

            stream_expressionNoIn.add(ex1.getTree());
            // ES3.g3:1332:2: ({...}? ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) ) | ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) ) )
            int alt58=2;
            int LA58_0 = input.LA(1);

            if ( (LA58_0==IN) ) {
                alt58=1;
            }
            else if ( (LA58_0==SEMIC) ) {
                alt58=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 58, 0, input);

                throw nvae;
            }
            switch (alt58) {
                case 1 :
                    // ES3.g3:1333:3: {...}? ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) )
                    {
                    if ( !(( isLeftHandSideIn(ex1, isLhs) )) ) {
                        throw new FailedPredicateException(input, "forControlExpression", " isLeftHandSideIn(ex1, isLhs) ");
                    }
                    // ES3.g3:1333:37: ( IN ex2= expression -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) ) )
                    // ES3.g3:1334:4: IN ex2= expression
                    {
                    IN212=(Token)match(input,IN,FOLLOW_IN_in_forControlExpression5075);  
                    stream_IN.add(IN212);

                    pushFollow(FOLLOW_expression_in_forControlExpression5079);
                    ex2=expression();

                    state._fsp--;

                    stream_expression.add(ex2.getTree());


                    // AST REWRITE
                    // elements: ex1, ex2
                    // token labels: 
                    // rule labels: retval, ex2, ex1
                    // token list labels: 
                    // rule list labels: 
                    // wildcard labels: 
                    retval.tree = root_0;
                    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
                    RewriteRuleSubtreeStream stream_ex2=new RewriteRuleSubtreeStream(adaptor,"rule ex2",ex2!=null?ex2.tree:null);
                    RewriteRuleSubtreeStream stream_ex1=new RewriteRuleSubtreeStream(adaptor,"rule ex1",ex1!=null?ex1.tree:null);

                    root_0 = (Object)adaptor.nil();
                    // 1335:4: -> ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) )
                    {
                        // ES3.g3:1335:7: ^( FORITER ^( EXPR $ex1) ^( EXPR $ex2) )
                        {
                        Object root_1 = (Object)adaptor.nil();
                        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(FORITER, "FORITER"), root_1);

                        // ES3.g3:1335:18: ^( EXPR $ex1)
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        adaptor.addChild(root_2, stream_ex1.nextTree());

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1335:33: ^( EXPR $ex2)
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        adaptor.addChild(root_2, stream_ex2.nextTree());

                        adaptor.addChild(root_1, root_2);
                        }

                        adaptor.addChild(root_0, root_1);
                        }

                    }

                    retval.tree = root_0;
                    }


                    }
                    break;
                case 2 :
                    // ES3.g3:1338:3: ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) )
                    {
                    // ES3.g3:1338:3: ( SEMIC (ex2= expression )? SEMIC (ex3= expression )? -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) ) )
                    // ES3.g3:1339:4: SEMIC (ex2= expression )? SEMIC (ex3= expression )?
                    {
                    SEMIC213=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlExpression5125);  
                    stream_SEMIC.add(SEMIC213);

                    // ES3.g3:1339:13: (ex2= expression )?
                    int alt56=2;
                    int LA56_0 = input.LA(1);

                    if ( ((LA56_0>=NULL && LA56_0<=FALSE)||LA56_0==DELETE||LA56_0==FUNCTION||LA56_0==NEW||LA56_0==THIS||LA56_0==TYPEOF||LA56_0==VOID||LA56_0==LBRACE||LA56_0==LPAREN||LA56_0==LBRACK||(LA56_0>=ADD && LA56_0<=SUB)||(LA56_0>=INC && LA56_0<=DEC)||(LA56_0>=NOT && LA56_0<=INV)||(LA56_0>=Identifier && LA56_0<=StringLiteral)||LA56_0==RegularExpressionLiteral||(LA56_0>=DecimalLiteral && LA56_0<=HexIntegerLiteral)) ) {
                        alt56=1;
                    }
                    switch (alt56) {
                        case 1 :
                            // ES3.g3:1339:13: ex2= expression
                            {
                            pushFollow(FOLLOW_expression_in_forControlExpression5129);
                            ex2=expression();

                            state._fsp--;

                            stream_expression.add(ex2.getTree());

                            }
                            break;

                    }

                    SEMIC214=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlExpression5132);  
                    stream_SEMIC.add(SEMIC214);

                    // ES3.g3:1339:35: (ex3= expression )?
                    int alt57=2;
                    int LA57_0 = input.LA(1);

                    if ( ((LA57_0>=NULL && LA57_0<=FALSE)||LA57_0==DELETE||LA57_0==FUNCTION||LA57_0==NEW||LA57_0==THIS||LA57_0==TYPEOF||LA57_0==VOID||LA57_0==LBRACE||LA57_0==LPAREN||LA57_0==LBRACK||(LA57_0>=ADD && LA57_0<=SUB)||(LA57_0>=INC && LA57_0<=DEC)||(LA57_0>=NOT && LA57_0<=INV)||(LA57_0>=Identifier && LA57_0<=StringLiteral)||LA57_0==RegularExpressionLiteral||(LA57_0>=DecimalLiteral && LA57_0<=HexIntegerLiteral)) ) {
                        alt57=1;
                    }
                    switch (alt57) {
                        case 1 :
                            // ES3.g3:1339:35: ex3= expression
                            {
                            pushFollow(FOLLOW_expression_in_forControlExpression5136);
                            ex3=expression();

                            state._fsp--;

                            stream_expression.add(ex3.getTree());

                            }
                            break;

                    }



                    // AST REWRITE
                    // elements: ex3, ex1, ex2
                    // token labels: 
                    // rule labels: retval, ex3, ex2, ex1
                    // token list labels: 
                    // rule list labels: 
                    // wildcard labels: 
                    retval.tree = root_0;
                    RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
                    RewriteRuleSubtreeStream stream_ex3=new RewriteRuleSubtreeStream(adaptor,"rule ex3",ex3!=null?ex3.tree:null);
                    RewriteRuleSubtreeStream stream_ex2=new RewriteRuleSubtreeStream(adaptor,"rule ex2",ex2!=null?ex2.tree:null);
                    RewriteRuleSubtreeStream stream_ex1=new RewriteRuleSubtreeStream(adaptor,"rule ex1",ex1!=null?ex1.tree:null);

                    root_0 = (Object)adaptor.nil();
                    // 1340:4: -> ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) )
                    {
                        // ES3.g3:1340:7: ^( FORSTEP ^( EXPR $ex1) ^( EXPR ( $ex2)? ) ^( EXPR ( $ex3)? ) )
                        {
                        Object root_1 = (Object)adaptor.nil();
                        root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(FORSTEP, "FORSTEP"), root_1);

                        // ES3.g3:1340:18: ^( EXPR $ex1)
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        adaptor.addChild(root_2, stream_ex1.nextTree());

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1340:33: ^( EXPR ( $ex2)? )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        // ES3.g3:1340:41: ( $ex2)?
                        if ( stream_ex2.hasNext() ) {
                            adaptor.addChild(root_2, stream_ex2.nextTree());

                        }
                        stream_ex2.reset();

                        adaptor.addChild(root_1, root_2);
                        }
                        // ES3.g3:1340:49: ^( EXPR ( $ex3)? )
                        {
                        Object root_2 = (Object)adaptor.nil();
                        root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                        // ES3.g3:1340:57: ( $ex3)?
                        if ( stream_ex3.hasNext() ) {
                            adaptor.addChild(root_2, stream_ex3.nextTree());

                        }
                        stream_ex3.reset();

                        adaptor.addChild(root_1, root_2);
                        }

                        adaptor.addChild(root_0, root_1);
                        }

                    }

                    retval.tree = root_0;
                    }


                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "forControlExpression"

    public static class forControlSemic_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "forControlSemic"
    // ES3.g3:1345:1: forControlSemic : SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( EXPR ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) ;
    public final ES3Parser.forControlSemic_return forControlSemic() throws RecognitionException {
        ES3Parser.forControlSemic_return retval = new ES3Parser.forControlSemic_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token SEMIC215=null;
        Token SEMIC216=null;
        ES3Parser.expression_return ex1 = null;

        ES3Parser.expression_return ex2 = null;


        Object SEMIC215_tree=null;
        Object SEMIC216_tree=null;
        RewriteRuleTokenStream stream_SEMIC=new RewriteRuleTokenStream(adaptor,"token SEMIC");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        try {
            // ES3.g3:1346:2: ( SEMIC (ex1= expression )? SEMIC (ex2= expression )? -> ^( FORSTEP ^( EXPR ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) ) )
            // ES3.g3:1346:4: SEMIC (ex1= expression )? SEMIC (ex2= expression )?
            {
            SEMIC215=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlSemic5195);  
            stream_SEMIC.add(SEMIC215);

            // ES3.g3:1346:13: (ex1= expression )?
            int alt59=2;
            int LA59_0 = input.LA(1);

            if ( ((LA59_0>=NULL && LA59_0<=FALSE)||LA59_0==DELETE||LA59_0==FUNCTION||LA59_0==NEW||LA59_0==THIS||LA59_0==TYPEOF||LA59_0==VOID||LA59_0==LBRACE||LA59_0==LPAREN||LA59_0==LBRACK||(LA59_0>=ADD && LA59_0<=SUB)||(LA59_0>=INC && LA59_0<=DEC)||(LA59_0>=NOT && LA59_0<=INV)||(LA59_0>=Identifier && LA59_0<=StringLiteral)||LA59_0==RegularExpressionLiteral||(LA59_0>=DecimalLiteral && LA59_0<=HexIntegerLiteral)) ) {
                alt59=1;
            }
            switch (alt59) {
                case 1 :
                    // ES3.g3:1346:13: ex1= expression
                    {
                    pushFollow(FOLLOW_expression_in_forControlSemic5199);
                    ex1=expression();

                    state._fsp--;

                    stream_expression.add(ex1.getTree());

                    }
                    break;

            }

            SEMIC216=(Token)match(input,SEMIC,FOLLOW_SEMIC_in_forControlSemic5202);  
            stream_SEMIC.add(SEMIC216);

            // ES3.g3:1346:35: (ex2= expression )?
            int alt60=2;
            int LA60_0 = input.LA(1);

            if ( ((LA60_0>=NULL && LA60_0<=FALSE)||LA60_0==DELETE||LA60_0==FUNCTION||LA60_0==NEW||LA60_0==THIS||LA60_0==TYPEOF||LA60_0==VOID||LA60_0==LBRACE||LA60_0==LPAREN||LA60_0==LBRACK||(LA60_0>=ADD && LA60_0<=SUB)||(LA60_0>=INC && LA60_0<=DEC)||(LA60_0>=NOT && LA60_0<=INV)||(LA60_0>=Identifier && LA60_0<=StringLiteral)||LA60_0==RegularExpressionLiteral||(LA60_0>=DecimalLiteral && LA60_0<=HexIntegerLiteral)) ) {
                alt60=1;
            }
            switch (alt60) {
                case 1 :
                    // ES3.g3:1346:35: ex2= expression
                    {
                    pushFollow(FOLLOW_expression_in_forControlSemic5206);
                    ex2=expression();

                    state._fsp--;

                    stream_expression.add(ex2.getTree());

                    }
                    break;

            }



            // AST REWRITE
            // elements: ex1, ex2
            // token labels: 
            // rule labels: retval, ex2, ex1
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);
            RewriteRuleSubtreeStream stream_ex2=new RewriteRuleSubtreeStream(adaptor,"rule ex2",ex2!=null?ex2.tree:null);
            RewriteRuleSubtreeStream stream_ex1=new RewriteRuleSubtreeStream(adaptor,"rule ex1",ex1!=null?ex1.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1347:2: -> ^( FORSTEP ^( EXPR ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) )
            {
                // ES3.g3:1347:5: ^( FORSTEP ^( EXPR ) ^( EXPR ( $ex1)? ) ^( EXPR ( $ex2)? ) )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(FORSTEP, "FORSTEP"), root_1);

                // ES3.g3:1347:16: ^( EXPR )
                {
                Object root_2 = (Object)adaptor.nil();
                root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                adaptor.addChild(root_1, root_2);
                }
                // ES3.g3:1347:26: ^( EXPR ( $ex1)? )
                {
                Object root_2 = (Object)adaptor.nil();
                root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                // ES3.g3:1347:34: ( $ex1)?
                if ( stream_ex1.hasNext() ) {
                    adaptor.addChild(root_2, stream_ex1.nextTree());

                }
                stream_ex1.reset();

                adaptor.addChild(root_1, root_2);
                }
                // ES3.g3:1347:42: ^( EXPR ( $ex2)? )
                {
                Object root_2 = (Object)adaptor.nil();
                root_2 = (Object)adaptor.becomeRoot((Object)adaptor.create(EXPR, "EXPR"), root_2);

                // ES3.g3:1347:50: ( $ex2)?
                if ( stream_ex2.hasNext() ) {
                    adaptor.addChild(root_2, stream_ex2.nextTree());

                }
                stream_ex2.reset();

                adaptor.addChild(root_1, root_2);
                }

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "forControlSemic"

    public static class continueStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "continueStatement"
    // ES3.g3:1359:1: continueStatement : CONTINUE ( Identifier )? semic ;
    public final ES3Parser.continueStatement_return continueStatement() throws RecognitionException {
        ES3Parser.continueStatement_return retval = new ES3Parser.continueStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token CONTINUE217=null;
        Token Identifier218=null;
        ES3Parser.semic_return semic219 = null;


        Object CONTINUE217_tree=null;
        Object Identifier218_tree=null;

        try {
            // ES3.g3:1360:2: ( CONTINUE ( Identifier )? semic )
            // ES3.g3:1360:4: CONTINUE ( Identifier )? semic
            {
            root_0 = (Object)adaptor.nil();

            CONTINUE217=(Token)match(input,CONTINUE,FOLLOW_CONTINUE_in_continueStatement5260); 
            CONTINUE217_tree = (Object)adaptor.create(CONTINUE217);
            root_0 = (Object)adaptor.becomeRoot(CONTINUE217_tree, root_0);

             if (input.LA(1) == Identifier) promoteEOL(null); 
            // ES3.g3:1360:67: ( Identifier )?
            int alt61=2;
            int LA61_0 = input.LA(1);

            if ( (LA61_0==Identifier) ) {
                alt61=1;
            }
            switch (alt61) {
                case 1 :
                    // ES3.g3:1360:67: Identifier
                    {
                    Identifier218=(Token)match(input,Identifier,FOLLOW_Identifier_in_continueStatement5265); 
                    Identifier218_tree = (Object)adaptor.create(Identifier218);
                    adaptor.addChild(root_0, Identifier218_tree);


                    }
                    break;

            }

            pushFollow(FOLLOW_semic_in_continueStatement5268);
            semic219=semic();

            state._fsp--;


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "continueStatement"

    public static class breakStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "breakStatement"
    // ES3.g3:1372:1: breakStatement : BREAK ( Identifier )? semic ;
    public final ES3Parser.breakStatement_return breakStatement() throws RecognitionException {
        ES3Parser.breakStatement_return retval = new ES3Parser.breakStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token BREAK220=null;
        Token Identifier221=null;
        ES3Parser.semic_return semic222 = null;


        Object BREAK220_tree=null;
        Object Identifier221_tree=null;

        try {
            // ES3.g3:1373:2: ( BREAK ( Identifier )? semic )
            // ES3.g3:1373:4: BREAK ( Identifier )? semic
            {
            root_0 = (Object)adaptor.nil();

            BREAK220=(Token)match(input,BREAK,FOLLOW_BREAK_in_breakStatement5287); 
            BREAK220_tree = (Object)adaptor.create(BREAK220);
            root_0 = (Object)adaptor.becomeRoot(BREAK220_tree, root_0);

             if (input.LA(1) == Identifier) promoteEOL(null); 
            // ES3.g3:1373:64: ( Identifier )?
            int alt62=2;
            int LA62_0 = input.LA(1);

            if ( (LA62_0==Identifier) ) {
                alt62=1;
            }
            switch (alt62) {
                case 1 :
                    // ES3.g3:1373:64: Identifier
                    {
                    Identifier221=(Token)match(input,Identifier,FOLLOW_Identifier_in_breakStatement5292); 
                    Identifier221_tree = (Object)adaptor.create(Identifier221);
                    adaptor.addChild(root_0, Identifier221_tree);


                    }
                    break;

            }

            pushFollow(FOLLOW_semic_in_breakStatement5295);
            semic222=semic();

            state._fsp--;


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "breakStatement"

    public static class returnStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "returnStatement"
    // ES3.g3:1393:1: returnStatement : RETURN ( expression )? semic ;
    public final ES3Parser.returnStatement_return returnStatement() throws RecognitionException {
        ES3Parser.returnStatement_return retval = new ES3Parser.returnStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token RETURN223=null;
        ES3Parser.expression_return expression224 = null;

        ES3Parser.semic_return semic225 = null;


        Object RETURN223_tree=null;

        try {
            // ES3.g3:1394:2: ( RETURN ( expression )? semic )
            // ES3.g3:1394:4: RETURN ( expression )? semic
            {
            root_0 = (Object)adaptor.nil();

            RETURN223=(Token)match(input,RETURN,FOLLOW_RETURN_in_returnStatement5314); 
            RETURN223_tree = (Object)adaptor.create(RETURN223);
            root_0 = (Object)adaptor.becomeRoot(RETURN223_tree, root_0);

             promoteEOL(null); 
            // ES3.g3:1394:34: ( expression )?
            int alt63=2;
            int LA63_0 = input.LA(1);

            if ( ((LA63_0>=NULL && LA63_0<=FALSE)||LA63_0==DELETE||LA63_0==FUNCTION||LA63_0==NEW||LA63_0==THIS||LA63_0==TYPEOF||LA63_0==VOID||LA63_0==LBRACE||LA63_0==LPAREN||LA63_0==LBRACK||(LA63_0>=ADD && LA63_0<=SUB)||(LA63_0>=INC && LA63_0<=DEC)||(LA63_0>=NOT && LA63_0<=INV)||(LA63_0>=Identifier && LA63_0<=StringLiteral)||LA63_0==RegularExpressionLiteral||(LA63_0>=DecimalLiteral && LA63_0<=HexIntegerLiteral)) ) {
                alt63=1;
            }
            switch (alt63) {
                case 1 :
                    // ES3.g3:1394:34: expression
                    {
                    pushFollow(FOLLOW_expression_in_returnStatement5319);
                    expression224=expression();

                    state._fsp--;

                    adaptor.addChild(root_0, expression224.getTree());

                    }
                    break;

            }

            pushFollow(FOLLOW_semic_in_returnStatement5322);
            semic225=semic();

            state._fsp--;


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "returnStatement"

    public static class withStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "withStatement"
    // ES3.g3:1401:1: withStatement : WITH LPAREN expression RPAREN statement ;
    public final ES3Parser.withStatement_return withStatement() throws RecognitionException {
        ES3Parser.withStatement_return retval = new ES3Parser.withStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token WITH226=null;
        Token LPAREN227=null;
        Token RPAREN229=null;
        ES3Parser.expression_return expression228 = null;

        ES3Parser.statement_return statement230 = null;


        Object WITH226_tree=null;
        Object LPAREN227_tree=null;
        Object RPAREN229_tree=null;

        try {
            // ES3.g3:1402:2: ( WITH LPAREN expression RPAREN statement )
            // ES3.g3:1402:4: WITH LPAREN expression RPAREN statement
            {
            root_0 = (Object)adaptor.nil();

            WITH226=(Token)match(input,WITH,FOLLOW_WITH_in_withStatement5339); 
            WITH226_tree = (Object)adaptor.create(WITH226);
            root_0 = (Object)adaptor.becomeRoot(WITH226_tree, root_0);

            LPAREN227=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_withStatement5342); 
            pushFollow(FOLLOW_expression_in_withStatement5345);
            expression228=expression();

            state._fsp--;

            adaptor.addChild(root_0, expression228.getTree());
            RPAREN229=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_withStatement5347); 
            pushFollow(FOLLOW_statement_in_withStatement5350);
            statement230=statement();

            state._fsp--;

            adaptor.addChild(root_0, statement230.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "withStatement"

    public static class switchStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "switchStatement"
    // ES3.g3:1409:1: switchStatement : SWITCH LPAREN expression RPAREN LBRACE ({...}? => defaultClause | caseClause )* RBRACE -> ^( SWITCH expression ( defaultClause )? ( caseClause )* ) ;
    public final ES3Parser.switchStatement_return switchStatement() throws RecognitionException {
        ES3Parser.switchStatement_return retval = new ES3Parser.switchStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token SWITCH231=null;
        Token LPAREN232=null;
        Token RPAREN234=null;
        Token LBRACE235=null;
        Token RBRACE238=null;
        ES3Parser.expression_return expression233 = null;

        ES3Parser.defaultClause_return defaultClause236 = null;

        ES3Parser.caseClause_return caseClause237 = null;


        Object SWITCH231_tree=null;
        Object LPAREN232_tree=null;
        Object RPAREN234_tree=null;
        Object LBRACE235_tree=null;
        Object RBRACE238_tree=null;
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_RBRACE=new RewriteRuleTokenStream(adaptor,"token RBRACE");
        RewriteRuleTokenStream stream_SWITCH=new RewriteRuleTokenStream(adaptor,"token SWITCH");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");
        RewriteRuleTokenStream stream_LBRACE=new RewriteRuleTokenStream(adaptor,"token LBRACE");
        RewriteRuleSubtreeStream stream_expression=new RewriteRuleSubtreeStream(adaptor,"rule expression");
        RewriteRuleSubtreeStream stream_caseClause=new RewriteRuleSubtreeStream(adaptor,"rule caseClause");
        RewriteRuleSubtreeStream stream_defaultClause=new RewriteRuleSubtreeStream(adaptor,"rule defaultClause");

        	int defaultClauseCount = 0;

        try {
            // ES3.g3:1414:2: ( SWITCH LPAREN expression RPAREN LBRACE ({...}? => defaultClause | caseClause )* RBRACE -> ^( SWITCH expression ( defaultClause )? ( caseClause )* ) )
            // ES3.g3:1414:4: SWITCH LPAREN expression RPAREN LBRACE ({...}? => defaultClause | caseClause )* RBRACE
            {
            SWITCH231=(Token)match(input,SWITCH,FOLLOW_SWITCH_in_switchStatement5371);  
            stream_SWITCH.add(SWITCH231);

            LPAREN232=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_switchStatement5373);  
            stream_LPAREN.add(LPAREN232);

            pushFollow(FOLLOW_expression_in_switchStatement5375);
            expression233=expression();

            state._fsp--;

            stream_expression.add(expression233.getTree());
            RPAREN234=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_switchStatement5377);  
            stream_RPAREN.add(RPAREN234);

            LBRACE235=(Token)match(input,LBRACE,FOLLOW_LBRACE_in_switchStatement5379);  
            stream_LBRACE.add(LBRACE235);

            // ES3.g3:1414:43: ({...}? => defaultClause | caseClause )*
            loop64:
            do {
                int alt64=3;
                int LA64_0 = input.LA(1);

                if ( (LA64_0==DEFAULT) && (( defaultClauseCount == 0 ))) {
                    alt64=1;
                }
                else if ( (LA64_0==CASE) ) {
                    alt64=2;
                }


                switch (alt64) {
            	case 1 :
            	    // ES3.g3:1414:45: {...}? => defaultClause
            	    {
            	    if ( !(( defaultClauseCount == 0 )) ) {
            	        throw new FailedPredicateException(input, "switchStatement", " defaultClauseCount == 0 ");
            	    }
            	    pushFollow(FOLLOW_defaultClause_in_switchStatement5386);
            	    defaultClause236=defaultClause();

            	    state._fsp--;

            	    stream_defaultClause.add(defaultClause236.getTree());
            	     defaultClauseCount++; 

            	    }
            	    break;
            	case 2 :
            	    // ES3.g3:1414:118: caseClause
            	    {
            	    pushFollow(FOLLOW_caseClause_in_switchStatement5392);
            	    caseClause237=caseClause();

            	    state._fsp--;

            	    stream_caseClause.add(caseClause237.getTree());

            	    }
            	    break;

            	default :
            	    break loop64;
                }
            } while (true);

            RBRACE238=(Token)match(input,RBRACE,FOLLOW_RBRACE_in_switchStatement5397);  
            stream_RBRACE.add(RBRACE238);



            // AST REWRITE
            // elements: expression, caseClause, defaultClause, SWITCH
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1415:2: -> ^( SWITCH expression ( defaultClause )? ( caseClause )* )
            {
                // ES3.g3:1415:5: ^( SWITCH expression ( defaultClause )? ( caseClause )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_SWITCH.nextNode(), root_1);

                adaptor.addChild(root_1, stream_expression.nextTree());
                // ES3.g3:1415:26: ( defaultClause )?
                if ( stream_defaultClause.hasNext() ) {
                    adaptor.addChild(root_1, stream_defaultClause.nextTree());

                }
                stream_defaultClause.reset();
                // ES3.g3:1415:41: ( caseClause )*
                while ( stream_caseClause.hasNext() ) {
                    adaptor.addChild(root_1, stream_caseClause.nextTree());

                }
                stream_caseClause.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "switchStatement"

    public static class caseClause_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "caseClause"
    // ES3.g3:1418:1: caseClause : CASE expression COLON ( statement )* ;
    public final ES3Parser.caseClause_return caseClause() throws RecognitionException {
        ES3Parser.caseClause_return retval = new ES3Parser.caseClause_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token CASE239=null;
        Token COLON241=null;
        ES3Parser.expression_return expression240 = null;

        ES3Parser.statement_return statement242 = null;


        Object CASE239_tree=null;
        Object COLON241_tree=null;

        try {
            // ES3.g3:1419:2: ( CASE expression COLON ( statement )* )
            // ES3.g3:1419:4: CASE expression COLON ( statement )*
            {
            root_0 = (Object)adaptor.nil();

            CASE239=(Token)match(input,CASE,FOLLOW_CASE_in_caseClause5425); 
            CASE239_tree = (Object)adaptor.create(CASE239);
            root_0 = (Object)adaptor.becomeRoot(CASE239_tree, root_0);

            pushFollow(FOLLOW_expression_in_caseClause5428);
            expression240=expression();

            state._fsp--;

            adaptor.addChild(root_0, expression240.getTree());
            COLON241=(Token)match(input,COLON,FOLLOW_COLON_in_caseClause5430); 
            // ES3.g3:1419:28: ( statement )*
            loop65:
            do {
                int alt65=2;
                int LA65_0 = input.LA(1);

                if ( ((LA65_0>=NULL && LA65_0<=BREAK)||LA65_0==CONTINUE||(LA65_0>=DELETE && LA65_0<=DO)||(LA65_0>=FOR && LA65_0<=IF)||(LA65_0>=NEW && LA65_0<=WITH)||LA65_0==LBRACE||LA65_0==LPAREN||LA65_0==LBRACK||LA65_0==SEMIC||(LA65_0>=ADD && LA65_0<=SUB)||(LA65_0>=INC && LA65_0<=DEC)||(LA65_0>=NOT && LA65_0<=INV)||(LA65_0>=Identifier && LA65_0<=StringLiteral)||LA65_0==RegularExpressionLiteral||(LA65_0>=DecimalLiteral && LA65_0<=HexIntegerLiteral)) ) {
                    alt65=1;
                }


                switch (alt65) {
            	case 1 :
            	    // ES3.g3:1419:28: statement
            	    {
            	    pushFollow(FOLLOW_statement_in_caseClause5433);
            	    statement242=statement();

            	    state._fsp--;

            	    adaptor.addChild(root_0, statement242.getTree());

            	    }
            	    break;

            	default :
            	    break loop65;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "caseClause"

    public static class defaultClause_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "defaultClause"
    // ES3.g3:1422:1: defaultClause : DEFAULT COLON ( statement )* ;
    public final ES3Parser.defaultClause_return defaultClause() throws RecognitionException {
        ES3Parser.defaultClause_return retval = new ES3Parser.defaultClause_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token DEFAULT243=null;
        Token COLON244=null;
        ES3Parser.statement_return statement245 = null;


        Object DEFAULT243_tree=null;
        Object COLON244_tree=null;

        try {
            // ES3.g3:1423:2: ( DEFAULT COLON ( statement )* )
            // ES3.g3:1423:4: DEFAULT COLON ( statement )*
            {
            root_0 = (Object)adaptor.nil();

            DEFAULT243=(Token)match(input,DEFAULT,FOLLOW_DEFAULT_in_defaultClause5446); 
            DEFAULT243_tree = (Object)adaptor.create(DEFAULT243);
            root_0 = (Object)adaptor.becomeRoot(DEFAULT243_tree, root_0);

            COLON244=(Token)match(input,COLON,FOLLOW_COLON_in_defaultClause5449); 
            // ES3.g3:1423:20: ( statement )*
            loop66:
            do {
                int alt66=2;
                int LA66_0 = input.LA(1);

                if ( ((LA66_0>=NULL && LA66_0<=BREAK)||LA66_0==CONTINUE||(LA66_0>=DELETE && LA66_0<=DO)||(LA66_0>=FOR && LA66_0<=IF)||(LA66_0>=NEW && LA66_0<=WITH)||LA66_0==LBRACE||LA66_0==LPAREN||LA66_0==LBRACK||LA66_0==SEMIC||(LA66_0>=ADD && LA66_0<=SUB)||(LA66_0>=INC && LA66_0<=DEC)||(LA66_0>=NOT && LA66_0<=INV)||(LA66_0>=Identifier && LA66_0<=StringLiteral)||LA66_0==RegularExpressionLiteral||(LA66_0>=DecimalLiteral && LA66_0<=HexIntegerLiteral)) ) {
                    alt66=1;
                }


                switch (alt66) {
            	case 1 :
            	    // ES3.g3:1423:20: statement
            	    {
            	    pushFollow(FOLLOW_statement_in_defaultClause5452);
            	    statement245=statement();

            	    state._fsp--;

            	    adaptor.addChild(root_0, statement245.getTree());

            	    }
            	    break;

            	default :
            	    break loop66;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "defaultClause"

    public static class labelledStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "labelledStatement"
    // ES3.g3:1430:1: labelledStatement : Identifier COLON statement -> ^( LABELLED Identifier statement ) ;
    public final ES3Parser.labelledStatement_return labelledStatement() throws RecognitionException {
        ES3Parser.labelledStatement_return retval = new ES3Parser.labelledStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token Identifier246=null;
        Token COLON247=null;
        ES3Parser.statement_return statement248 = null;


        Object Identifier246_tree=null;
        Object COLON247_tree=null;
        RewriteRuleTokenStream stream_COLON=new RewriteRuleTokenStream(adaptor,"token COLON");
        RewriteRuleTokenStream stream_Identifier=new RewriteRuleTokenStream(adaptor,"token Identifier");
        RewriteRuleSubtreeStream stream_statement=new RewriteRuleSubtreeStream(adaptor,"rule statement");
        try {
            // ES3.g3:1431:2: ( Identifier COLON statement -> ^( LABELLED Identifier statement ) )
            // ES3.g3:1431:4: Identifier COLON statement
            {
            Identifier246=(Token)match(input,Identifier,FOLLOW_Identifier_in_labelledStatement5469);  
            stream_Identifier.add(Identifier246);

            COLON247=(Token)match(input,COLON,FOLLOW_COLON_in_labelledStatement5471);  
            stream_COLON.add(COLON247);

            pushFollow(FOLLOW_statement_in_labelledStatement5473);
            statement248=statement();

            state._fsp--;

            stream_statement.add(statement248.getTree());


            // AST REWRITE
            // elements: statement, Identifier
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1432:2: -> ^( LABELLED Identifier statement )
            {
                // ES3.g3:1432:5: ^( LABELLED Identifier statement )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(LABELLED, "LABELLED"), root_1);

                adaptor.addChild(root_1, stream_Identifier.nextNode());
                adaptor.addChild(root_1, stream_statement.nextTree());

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "labelledStatement"

    public static class throwStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "throwStatement"
    // ES3.g3:1454:1: throwStatement : THROW expression semic ;
    public final ES3Parser.throwStatement_return throwStatement() throws RecognitionException {
        ES3Parser.throwStatement_return retval = new ES3Parser.throwStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token THROW249=null;
        ES3Parser.expression_return expression250 = null;

        ES3Parser.semic_return semic251 = null;


        Object THROW249_tree=null;

        try {
            // ES3.g3:1455:2: ( THROW expression semic )
            // ES3.g3:1455:4: THROW expression semic
            {
            root_0 = (Object)adaptor.nil();

            THROW249=(Token)match(input,THROW,FOLLOW_THROW_in_throwStatement5504); 
            THROW249_tree = (Object)adaptor.create(THROW249);
            root_0 = (Object)adaptor.becomeRoot(THROW249_tree, root_0);

             promoteEOL(null); 
            pushFollow(FOLLOW_expression_in_throwStatement5509);
            expression250=expression();

            state._fsp--;

            adaptor.addChild(root_0, expression250.getTree());
            pushFollow(FOLLOW_semic_in_throwStatement5511);
            semic251=semic();

            state._fsp--;


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "throwStatement"

    public static class tryStatement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "tryStatement"
    // ES3.g3:1462:1: tryStatement : TRY block ( catchClause ( finallyClause )? | finallyClause ) ;
    public final ES3Parser.tryStatement_return tryStatement() throws RecognitionException {
        ES3Parser.tryStatement_return retval = new ES3Parser.tryStatement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token TRY252=null;
        ES3Parser.block_return block253 = null;

        ES3Parser.catchClause_return catchClause254 = null;

        ES3Parser.finallyClause_return finallyClause255 = null;

        ES3Parser.finallyClause_return finallyClause256 = null;


        Object TRY252_tree=null;

        try {
            // ES3.g3:1463:2: ( TRY block ( catchClause ( finallyClause )? | finallyClause ) )
            // ES3.g3:1463:4: TRY block ( catchClause ( finallyClause )? | finallyClause )
            {
            root_0 = (Object)adaptor.nil();

            TRY252=(Token)match(input,TRY,FOLLOW_TRY_in_tryStatement5528); 
            TRY252_tree = (Object)adaptor.create(TRY252);
            root_0 = (Object)adaptor.becomeRoot(TRY252_tree, root_0);

            pushFollow(FOLLOW_block_in_tryStatement5531);
            block253=block();

            state._fsp--;

            adaptor.addChild(root_0, block253.getTree());
            // ES3.g3:1463:15: ( catchClause ( finallyClause )? | finallyClause )
            int alt68=2;
            int LA68_0 = input.LA(1);

            if ( (LA68_0==CATCH) ) {
                alt68=1;
            }
            else if ( (LA68_0==FINALLY) ) {
                alt68=2;
            }
            else {
                NoViableAltException nvae =
                    new NoViableAltException("", 68, 0, input);

                throw nvae;
            }
            switch (alt68) {
                case 1 :
                    // ES3.g3:1463:17: catchClause ( finallyClause )?
                    {
                    pushFollow(FOLLOW_catchClause_in_tryStatement5535);
                    catchClause254=catchClause();

                    state._fsp--;

                    adaptor.addChild(root_0, catchClause254.getTree());
                    // ES3.g3:1463:29: ( finallyClause )?
                    int alt67=2;
                    int LA67_0 = input.LA(1);

                    if ( (LA67_0==FINALLY) ) {
                        alt67=1;
                    }
                    switch (alt67) {
                        case 1 :
                            // ES3.g3:1463:29: finallyClause
                            {
                            pushFollow(FOLLOW_finallyClause_in_tryStatement5537);
                            finallyClause255=finallyClause();

                            state._fsp--;

                            adaptor.addChild(root_0, finallyClause255.getTree());

                            }
                            break;

                    }


                    }
                    break;
                case 2 :
                    // ES3.g3:1463:46: finallyClause
                    {
                    pushFollow(FOLLOW_finallyClause_in_tryStatement5542);
                    finallyClause256=finallyClause();

                    state._fsp--;

                    adaptor.addChild(root_0, finallyClause256.getTree());

                    }
                    break;

            }


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "tryStatement"

    public static class catchClause_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "catchClause"
    // ES3.g3:1466:1: catchClause : CATCH LPAREN Identifier RPAREN block ;
    public final ES3Parser.catchClause_return catchClause() throws RecognitionException {
        ES3Parser.catchClause_return retval = new ES3Parser.catchClause_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token CATCH257=null;
        Token LPAREN258=null;
        Token Identifier259=null;
        Token RPAREN260=null;
        ES3Parser.block_return block261 = null;


        Object CATCH257_tree=null;
        Object LPAREN258_tree=null;
        Object Identifier259_tree=null;
        Object RPAREN260_tree=null;

        try {
            // ES3.g3:1467:2: ( CATCH LPAREN Identifier RPAREN block )
            // ES3.g3:1467:4: CATCH LPAREN Identifier RPAREN block
            {
            root_0 = (Object)adaptor.nil();

            CATCH257=(Token)match(input,CATCH,FOLLOW_CATCH_in_catchClause5556); 
            CATCH257_tree = (Object)adaptor.create(CATCH257);
            root_0 = (Object)adaptor.becomeRoot(CATCH257_tree, root_0);

            LPAREN258=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_catchClause5559); 
            Identifier259=(Token)match(input,Identifier,FOLLOW_Identifier_in_catchClause5562); 
            Identifier259_tree = (Object)adaptor.create(Identifier259);
            adaptor.addChild(root_0, Identifier259_tree);

            RPAREN260=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_catchClause5564); 
            pushFollow(FOLLOW_block_in_catchClause5567);
            block261=block();

            state._fsp--;

            adaptor.addChild(root_0, block261.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "catchClause"

    public static class finallyClause_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "finallyClause"
    // ES3.g3:1470:1: finallyClause : FINALLY block ;
    public final ES3Parser.finallyClause_return finallyClause() throws RecognitionException {
        ES3Parser.finallyClause_return retval = new ES3Parser.finallyClause_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token FINALLY262=null;
        ES3Parser.block_return block263 = null;


        Object FINALLY262_tree=null;

        try {
            // ES3.g3:1471:2: ( FINALLY block )
            // ES3.g3:1471:4: FINALLY block
            {
            root_0 = (Object)adaptor.nil();

            FINALLY262=(Token)match(input,FINALLY,FOLLOW_FINALLY_in_finallyClause5579); 
            FINALLY262_tree = (Object)adaptor.create(FINALLY262);
            root_0 = (Object)adaptor.becomeRoot(FINALLY262_tree, root_0);

            pushFollow(FOLLOW_block_in_finallyClause5582);
            block263=block();

            state._fsp--;

            adaptor.addChild(root_0, block263.getTree());

            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "finallyClause"

    public static class functionDeclaration_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "functionDeclaration"
    // ES3.g3:1484:1: functionDeclaration : FUNCTION name= Identifier formalParameterList functionBody -> ^( FUNCTION $name formalParameterList functionBody ) ;
    public final ES3Parser.functionDeclaration_return functionDeclaration() throws RecognitionException {
        ES3Parser.functionDeclaration_return retval = new ES3Parser.functionDeclaration_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token name=null;
        Token FUNCTION264=null;
        ES3Parser.formalParameterList_return formalParameterList265 = null;

        ES3Parser.functionBody_return functionBody266 = null;


        Object name_tree=null;
        Object FUNCTION264_tree=null;
        RewriteRuleTokenStream stream_FUNCTION=new RewriteRuleTokenStream(adaptor,"token FUNCTION");
        RewriteRuleTokenStream stream_Identifier=new RewriteRuleTokenStream(adaptor,"token Identifier");
        RewriteRuleSubtreeStream stream_functionBody=new RewriteRuleSubtreeStream(adaptor,"rule functionBody");
        RewriteRuleSubtreeStream stream_formalParameterList=new RewriteRuleSubtreeStream(adaptor,"rule formalParameterList");
        try {
            // ES3.g3:1485:2: ( FUNCTION name= Identifier formalParameterList functionBody -> ^( FUNCTION $name formalParameterList functionBody ) )
            // ES3.g3:1485:4: FUNCTION name= Identifier formalParameterList functionBody
            {
            FUNCTION264=(Token)match(input,FUNCTION,FOLLOW_FUNCTION_in_functionDeclaration5603);  
            stream_FUNCTION.add(FUNCTION264);

            name=(Token)match(input,Identifier,FOLLOW_Identifier_in_functionDeclaration5607);  
            stream_Identifier.add(name);

            pushFollow(FOLLOW_formalParameterList_in_functionDeclaration5609);
            formalParameterList265=formalParameterList();

            state._fsp--;

            stream_formalParameterList.add(formalParameterList265.getTree());
            pushFollow(FOLLOW_functionBody_in_functionDeclaration5611);
            functionBody266=functionBody();

            state._fsp--;

            stream_functionBody.add(functionBody266.getTree());


            // AST REWRITE
            // elements: FUNCTION, formalParameterList, name, functionBody
            // token labels: name
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleTokenStream stream_name=new RewriteRuleTokenStream(adaptor,"token name",name);
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1486:2: -> ^( FUNCTION $name formalParameterList functionBody )
            {
                // ES3.g3:1486:5: ^( FUNCTION $name formalParameterList functionBody )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_FUNCTION.nextNode(), root_1);

                adaptor.addChild(root_1, stream_name.nextNode());
                adaptor.addChild(root_1, stream_formalParameterList.nextTree());
                adaptor.addChild(root_1, stream_functionBody.nextTree());

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "functionDeclaration"

    public static class functionExpression_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "functionExpression"
    // ES3.g3:1489:1: functionExpression : FUNCTION (name= Identifier )? formalParameterList functionBody -> ^( FUNCTION ( $name)? formalParameterList functionBody ) ;
    public final ES3Parser.functionExpression_return functionExpression() throws RecognitionException {
        ES3Parser.functionExpression_return retval = new ES3Parser.functionExpression_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token name=null;
        Token FUNCTION267=null;
        ES3Parser.formalParameterList_return formalParameterList268 = null;

        ES3Parser.functionBody_return functionBody269 = null;


        Object name_tree=null;
        Object FUNCTION267_tree=null;
        RewriteRuleTokenStream stream_FUNCTION=new RewriteRuleTokenStream(adaptor,"token FUNCTION");
        RewriteRuleTokenStream stream_Identifier=new RewriteRuleTokenStream(adaptor,"token Identifier");
        RewriteRuleSubtreeStream stream_functionBody=new RewriteRuleSubtreeStream(adaptor,"rule functionBody");
        RewriteRuleSubtreeStream stream_formalParameterList=new RewriteRuleSubtreeStream(adaptor,"rule formalParameterList");
        try {
            // ES3.g3:1490:2: ( FUNCTION (name= Identifier )? formalParameterList functionBody -> ^( FUNCTION ( $name)? formalParameterList functionBody ) )
            // ES3.g3:1490:4: FUNCTION (name= Identifier )? formalParameterList functionBody
            {
            FUNCTION267=(Token)match(input,FUNCTION,FOLLOW_FUNCTION_in_functionExpression5638);  
            stream_FUNCTION.add(FUNCTION267);

            // ES3.g3:1490:17: (name= Identifier )?
            int alt69=2;
            int LA69_0 = input.LA(1);

            if ( (LA69_0==Identifier) ) {
                alt69=1;
            }
            switch (alt69) {
                case 1 :
                    // ES3.g3:1490:17: name= Identifier
                    {
                    name=(Token)match(input,Identifier,FOLLOW_Identifier_in_functionExpression5642);  
                    stream_Identifier.add(name);


                    }
                    break;

            }

            pushFollow(FOLLOW_formalParameterList_in_functionExpression5645);
            formalParameterList268=formalParameterList();

            state._fsp--;

            stream_formalParameterList.add(formalParameterList268.getTree());
            pushFollow(FOLLOW_functionBody_in_functionExpression5647);
            functionBody269=functionBody();

            state._fsp--;

            stream_functionBody.add(functionBody269.getTree());


            // AST REWRITE
            // elements: functionBody, formalParameterList, name, FUNCTION
            // token labels: name
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleTokenStream stream_name=new RewriteRuleTokenStream(adaptor,"token name",name);
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1491:2: -> ^( FUNCTION ( $name)? formalParameterList functionBody )
            {
                // ES3.g3:1491:5: ^( FUNCTION ( $name)? formalParameterList functionBody )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot(stream_FUNCTION.nextNode(), root_1);

                // ES3.g3:1491:17: ( $name)?
                if ( stream_name.hasNext() ) {
                    adaptor.addChild(root_1, stream_name.nextNode());

                }
                stream_name.reset();
                adaptor.addChild(root_1, stream_formalParameterList.nextTree());
                adaptor.addChild(root_1, stream_functionBody.nextTree());

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "functionExpression"

    public static class formalParameterList_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "formalParameterList"
    // ES3.g3:1494:1: formalParameterList : LPAREN ( Identifier ( COMMA Identifier )* )? RPAREN -> ^( ARGS ( Identifier )* ) ;
    public final ES3Parser.formalParameterList_return formalParameterList() throws RecognitionException {
        ES3Parser.formalParameterList_return retval = new ES3Parser.formalParameterList_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token LPAREN270=null;
        Token Identifier271=null;
        Token COMMA272=null;
        Token Identifier273=null;
        Token RPAREN274=null;

        Object LPAREN270_tree=null;
        Object Identifier271_tree=null;
        Object COMMA272_tree=null;
        Object Identifier273_tree=null;
        Object RPAREN274_tree=null;
        RewriteRuleTokenStream stream_RPAREN=new RewriteRuleTokenStream(adaptor,"token RPAREN");
        RewriteRuleTokenStream stream_COMMA=new RewriteRuleTokenStream(adaptor,"token COMMA");
        RewriteRuleTokenStream stream_Identifier=new RewriteRuleTokenStream(adaptor,"token Identifier");
        RewriteRuleTokenStream stream_LPAREN=new RewriteRuleTokenStream(adaptor,"token LPAREN");

        try {
            // ES3.g3:1495:2: ( LPAREN ( Identifier ( COMMA Identifier )* )? RPAREN -> ^( ARGS ( Identifier )* ) )
            // ES3.g3:1495:4: LPAREN ( Identifier ( COMMA Identifier )* )? RPAREN
            {
            LPAREN270=(Token)match(input,LPAREN,FOLLOW_LPAREN_in_formalParameterList5675);  
            stream_LPAREN.add(LPAREN270);

            // ES3.g3:1495:11: ( Identifier ( COMMA Identifier )* )?
            int alt71=2;
            int LA71_0 = input.LA(1);

            if ( (LA71_0==Identifier) ) {
                alt71=1;
            }
            switch (alt71) {
                case 1 :
                    // ES3.g3:1495:13: Identifier ( COMMA Identifier )*
                    {
                    Identifier271=(Token)match(input,Identifier,FOLLOW_Identifier_in_formalParameterList5679);  
                    stream_Identifier.add(Identifier271);

                    // ES3.g3:1495:24: ( COMMA Identifier )*
                    loop70:
                    do {
                        int alt70=2;
                        int LA70_0 = input.LA(1);

                        if ( (LA70_0==COMMA) ) {
                            alt70=1;
                        }


                        switch (alt70) {
                    	case 1 :
                    	    // ES3.g3:1495:26: COMMA Identifier
                    	    {
                    	    COMMA272=(Token)match(input,COMMA,FOLLOW_COMMA_in_formalParameterList5683);  
                    	    stream_COMMA.add(COMMA272);

                    	    Identifier273=(Token)match(input,Identifier,FOLLOW_Identifier_in_formalParameterList5685);  
                    	    stream_Identifier.add(Identifier273);


                    	    }
                    	    break;

                    	default :
                    	    break loop70;
                        }
                    } while (true);


                    }
                    break;

            }

            RPAREN274=(Token)match(input,RPAREN,FOLLOW_RPAREN_in_formalParameterList5693);  
            stream_RPAREN.add(RPAREN274);



            // AST REWRITE
            // elements: Identifier
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1496:2: -> ^( ARGS ( Identifier )* )
            {
                // ES3.g3:1496:5: ^( ARGS ( Identifier )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(ARGS, "ARGS"), root_1);

                // ES3.g3:1496:13: ( Identifier )*
                while ( stream_Identifier.hasNext() ) {
                    adaptor.addChild(root_1, stream_Identifier.nextNode());

                }
                stream_Identifier.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "formalParameterList"

    public static class functionBody_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "functionBody"
    // ES3.g3:1499:1: functionBody : lb= LBRACE ( sourceElement )* RBRACE -> ^( BLOCK[$lb, \"BLOCK\"] ( sourceElement )* ) ;
    public final ES3Parser.functionBody_return functionBody() throws RecognitionException {
        ES3Parser.functionBody_return retval = new ES3Parser.functionBody_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        Token lb=null;
        Token RBRACE276=null;
        ES3Parser.sourceElement_return sourceElement275 = null;


        Object lb_tree=null;
        Object RBRACE276_tree=null;
        RewriteRuleTokenStream stream_RBRACE=new RewriteRuleTokenStream(adaptor,"token RBRACE");
        RewriteRuleTokenStream stream_LBRACE=new RewriteRuleTokenStream(adaptor,"token LBRACE");
        RewriteRuleSubtreeStream stream_sourceElement=new RewriteRuleSubtreeStream(adaptor,"rule sourceElement");
        try {
            // ES3.g3:1500:2: (lb= LBRACE ( sourceElement )* RBRACE -> ^( BLOCK[$lb, \"BLOCK\"] ( sourceElement )* ) )
            // ES3.g3:1500:4: lb= LBRACE ( sourceElement )* RBRACE
            {
            lb=(Token)match(input,LBRACE,FOLLOW_LBRACE_in_functionBody5718);  
            stream_LBRACE.add(lb);

            // ES3.g3:1500:14: ( sourceElement )*
            loop72:
            do {
                int alt72=2;
                int LA72_0 = input.LA(1);

                if ( ((LA72_0>=NULL && LA72_0<=BREAK)||LA72_0==CONTINUE||(LA72_0>=DELETE && LA72_0<=DO)||(LA72_0>=FOR && LA72_0<=IF)||(LA72_0>=NEW && LA72_0<=WITH)||LA72_0==LBRACE||LA72_0==LPAREN||LA72_0==LBRACK||LA72_0==SEMIC||(LA72_0>=ADD && LA72_0<=SUB)||(LA72_0>=INC && LA72_0<=DEC)||(LA72_0>=NOT && LA72_0<=INV)||(LA72_0>=Identifier && LA72_0<=StringLiteral)||LA72_0==RegularExpressionLiteral||(LA72_0>=DecimalLiteral && LA72_0<=HexIntegerLiteral)) ) {
                    alt72=1;
                }


                switch (alt72) {
            	case 1 :
            	    // ES3.g3:1500:14: sourceElement
            	    {
            	    pushFollow(FOLLOW_sourceElement_in_functionBody5720);
            	    sourceElement275=sourceElement();

            	    state._fsp--;

            	    stream_sourceElement.add(sourceElement275.getTree());

            	    }
            	    break;

            	default :
            	    break loop72;
                }
            } while (true);

            RBRACE276=(Token)match(input,RBRACE,FOLLOW_RBRACE_in_functionBody5723);  
            stream_RBRACE.add(RBRACE276);



            // AST REWRITE
            // elements: sourceElement
            // token labels: 
            // rule labels: retval
            // token list labels: 
            // rule list labels: 
            // wildcard labels: 
            retval.tree = root_0;
            RewriteRuleSubtreeStream stream_retval=new RewriteRuleSubtreeStream(adaptor,"rule retval",retval!=null?retval.tree:null);

            root_0 = (Object)adaptor.nil();
            // 1501:2: -> ^( BLOCK[$lb, \"BLOCK\"] ( sourceElement )* )
            {
                // ES3.g3:1501:5: ^( BLOCK[$lb, \"BLOCK\"] ( sourceElement )* )
                {
                Object root_1 = (Object)adaptor.nil();
                root_1 = (Object)adaptor.becomeRoot((Object)adaptor.create(BLOCK, lb, "BLOCK"), root_1);

                // ES3.g3:1501:28: ( sourceElement )*
                while ( stream_sourceElement.hasNext() ) {
                    adaptor.addChild(root_1, stream_sourceElement.nextTree());

                }
                stream_sourceElement.reset();

                adaptor.addChild(root_0, root_1);
                }

            }

            retval.tree = root_0;
            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "functionBody"

    public static class program_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "program"
    // ES3.g3:1508:1: program : ( sourceElement )* ;
    public final ES3Parser.program_return program() throws RecognitionException {
        ES3Parser.program_return retval = new ES3Parser.program_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.sourceElement_return sourceElement277 = null;



        try {
            // ES3.g3:1509:2: ( ( sourceElement )* )
            // ES3.g3:1509:4: ( sourceElement )*
            {
            root_0 = (Object)adaptor.nil();

            // ES3.g3:1509:4: ( sourceElement )*
            loop73:
            do {
                int alt73=2;
                int LA73_0 = input.LA(1);

                if ( ((LA73_0>=NULL && LA73_0<=BREAK)||LA73_0==CONTINUE||(LA73_0>=DELETE && LA73_0<=DO)||(LA73_0>=FOR && LA73_0<=IF)||(LA73_0>=NEW && LA73_0<=WITH)||LA73_0==LBRACE||LA73_0==LPAREN||LA73_0==LBRACK||LA73_0==SEMIC||(LA73_0>=ADD && LA73_0<=SUB)||(LA73_0>=INC && LA73_0<=DEC)||(LA73_0>=NOT && LA73_0<=INV)||(LA73_0>=Identifier && LA73_0<=StringLiteral)||LA73_0==RegularExpressionLiteral||(LA73_0>=DecimalLiteral && LA73_0<=HexIntegerLiteral)) ) {
                    alt73=1;
                }


                switch (alt73) {
            	case 1 :
            	    // ES3.g3:1509:4: sourceElement
            	    {
            	    pushFollow(FOLLOW_sourceElement_in_program5752);
            	    sourceElement277=sourceElement();

            	    state._fsp--;

            	    adaptor.addChild(root_0, sourceElement277.getTree());

            	    }
            	    break;

            	default :
            	    break loop73;
                }
            } while (true);


            }

            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "program"

    public static class sourceElement_return extends ParserRuleReturnScope {
        Object tree;
        public Object getTree() { return tree; }
    };

    // $ANTLR start "sourceElement"
    // ES3.g3:1517:1: sourceElement options {k=1; } : ({...}? functionDeclaration | statement );
    public final ES3Parser.sourceElement_return sourceElement() throws RecognitionException {
        ES3Parser.sourceElement_return retval = new ES3Parser.sourceElement_return();
        retval.start = input.LT(1);

        Object root_0 = null;

        ES3Parser.functionDeclaration_return functionDeclaration278 = null;

        ES3Parser.statement_return statement279 = null;



        try {
            // ES3.g3:1522:2: ({...}? functionDeclaration | statement )
            int alt74=2;
            alt74 = dfa74.predict(input);
            switch (alt74) {
                case 1 :
                    // ES3.g3:1522:4: {...}? functionDeclaration
                    {
                    root_0 = (Object)adaptor.nil();

                    if ( !(( input.LA(1) == FUNCTION )) ) {
                        throw new FailedPredicateException(input, "sourceElement", " input.LA(1) == FUNCTION ");
                    }
                    pushFollow(FOLLOW_functionDeclaration_in_sourceElement5781);
                    functionDeclaration278=functionDeclaration();

                    state._fsp--;

                    adaptor.addChild(root_0, functionDeclaration278.getTree());

                    }
                    break;
                case 2 :
                    // ES3.g3:1523:4: statement
                    {
                    root_0 = (Object)adaptor.nil();

                    pushFollow(FOLLOW_statement_in_sourceElement5786);
                    statement279=statement();

                    state._fsp--;

                    adaptor.addChild(root_0, statement279.getTree());

                    }
                    break;

            }
            retval.stop = input.LT(-1);

            retval.tree = (Object)adaptor.rulePostProcessing(root_0);
            adaptor.setTokenBoundaries(retval.tree, retval.start, retval.stop);

        }
        catch (RecognitionException re) {
            reportError(re);
            recover(input,re);
    	retval.tree = (Object)adaptor.errorNode(input, retval.start, input.LT(-1), re);

        }
        finally {
        }
        return retval;
    }
    // $ANTLR end "sourceElement"

    // Delegated rules


    protected DFA43 dfa43 = new DFA43(this);
    protected DFA44 dfa44 = new DFA44(this);
    protected DFA74 dfa74 = new DFA74(this);
    static final String DFA43_eotS =
        "\44\uffff";
    static final String DFA43_eofS =
        "\44\uffff";
    static final String DFA43_minS =
        "\1\4\1\0\42\uffff";
    static final String DFA43_maxS =
        "\1\u00a1\1\0\42\uffff";
    static final String DFA43_acceptS =
        "\2\uffff\1\2\40\uffff\1\1";
    static final String DFA43_specialS =
        "\1\uffff\1\0\42\uffff}>";
    static final String[] DFA43_transitionS = {
            "\4\2\2\uffff\1\2\1\uffff\2\2\2\uffff\3\2\2\uffff\13\2\37\uffff"+
            "\1\1\1\uffff\1\2\1\uffff\1\2\2\uffff\1\2\11\uffff\2\2\2\uffff"+
            "\2\2\6\uffff\2\2\66\uffff\2\2\5\uffff\1\2\3\uffff\3\2",
            "\1\uffff",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
    };

    static final short[] DFA43_eot = DFA.unpackEncodedString(DFA43_eotS);
    static final short[] DFA43_eof = DFA.unpackEncodedString(DFA43_eofS);
    static final char[] DFA43_min = DFA.unpackEncodedStringToUnsignedChars(DFA43_minS);
    static final char[] DFA43_max = DFA.unpackEncodedStringToUnsignedChars(DFA43_maxS);
    static final short[] DFA43_accept = DFA.unpackEncodedString(DFA43_acceptS);
    static final short[] DFA43_special = DFA.unpackEncodedString(DFA43_specialS);
    static final short[][] DFA43_transition;

    static {
        int numStates = DFA43_transitionS.length;
        DFA43_transition = new short[numStates][];
        for (int i=0; i<numStates; i++) {
            DFA43_transition[i] = DFA.unpackEncodedString(DFA43_transitionS[i]);
        }
    }

    class DFA43 extends DFA {

        public DFA43(BaseRecognizer recognizer) {
            this.recognizer = recognizer;
            this.decisionNumber = 43;
            this.eot = DFA43_eot;
            this.eof = DFA43_eof;
            this.min = DFA43_min;
            this.max = DFA43_max;
            this.accept = DFA43_accept;
            this.special = DFA43_special;
            this.transition = DFA43_transition;
        }
        public String getDescription() {
            return "1160:1: statement options {k=1; } : ({...}? block | statementTail );";
        }
        public int specialStateTransition(int s, IntStream _input) throws NoViableAltException {
            TokenStream input = (TokenStream)_input;
        	int _s = s;
            switch ( s ) {
                    case 0 : 
                        int LA43_1 = input.LA(1);

                         
                        int index43_1 = input.index();
                        input.rewind();
                        s = -1;
                        if ( (( input.LA(1) == LBRACE )) ) {s = 35;}

                        else if ( (true) ) {s = 2;}

                         
                        input.seek(index43_1);
                        if ( s>=0 ) return s;
                        break;
            }
            NoViableAltException nvae =
                new NoViableAltException(getDescription(), 43, _s, input);
            error(nvae);
            throw nvae;
        }
    }
    static final String DFA44_eotS =
        "\17\uffff";
    static final String DFA44_eofS =
        "\4\uffff\1\3\12\uffff";
    static final String DFA44_minS =
        "\1\4\3\uffff\1\23\12\uffff";
    static final String DFA44_maxS =
        "\1\u00a1\3\uffff\1\u0092\12\uffff";
    static final String DFA44_acceptS =
        "\1\uffff\1\1\1\2\1\3\1\uffff\1\4\1\5\1\6\1\7\1\10\1\11\1\13\1\14"+
        "\1\15\1\12";
    static final String DFA44_specialS =
        "\17\uffff}>";
    static final String[] DFA44_transitionS = {
            "\3\3\1\10\2\uffff\1\7\1\uffff\1\3\1\6\2\uffff\1\6\1\3\1\5\2"+
            "\uffff\1\3\1\11\1\13\1\3\1\14\1\15\1\3\1\1\1\3\1\6\1\12\37\uffff"+
            "\1\3\1\uffff\1\3\1\uffff\1\3\2\uffff\1\2\11\uffff\2\3\2\uffff"+
            "\2\3\6\uffff\2\3\66\uffff\1\4\1\3\5\uffff\1\3\3\uffff\3\3",
            "",
            "",
            "",
            "\2\3\53\uffff\2\3\1\uffff\1\3\1\uffff\27\3\2\uffff\3\3\1\16"+
            "\15\3\42\uffff\2\3",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
    };

    static final short[] DFA44_eot = DFA.unpackEncodedString(DFA44_eotS);
    static final short[] DFA44_eof = DFA.unpackEncodedString(DFA44_eofS);
    static final char[] DFA44_min = DFA.unpackEncodedStringToUnsignedChars(DFA44_minS);
    static final char[] DFA44_max = DFA.unpackEncodedStringToUnsignedChars(DFA44_maxS);
    static final short[] DFA44_accept = DFA.unpackEncodedString(DFA44_acceptS);
    static final short[] DFA44_special = DFA.unpackEncodedString(DFA44_specialS);
    static final short[][] DFA44_transition;

    static {
        int numStates = DFA44_transitionS.length;
        DFA44_transition = new short[numStates][];
        for (int i=0; i<numStates; i++) {
            DFA44_transition[i] = DFA.unpackEncodedString(DFA44_transitionS[i]);
        }
    }

    class DFA44 extends DFA {

        public DFA44(BaseRecognizer recognizer) {
            this.recognizer = recognizer;
            this.decisionNumber = 44;
            this.eot = DFA44_eot;
            this.eof = DFA44_eof;
            this.min = DFA44_min;
            this.max = DFA44_max;
            this.accept = DFA44_accept;
            this.special = DFA44_special;
            this.transition = DFA44_transition;
        }
        public String getDescription() {
            return "1169:1: statementTail : ( variableStatement | emptyStatement | expressionStatement | ifStatement | iterationStatement | continueStatement | breakStatement | returnStatement | withStatement | labelledStatement | switchStatement | throwStatement | tryStatement );";
        }
    }
    static final String DFA74_eotS =
        "\44\uffff";
    static final String DFA74_eofS =
        "\44\uffff";
    static final String DFA74_minS =
        "\1\4\1\0\42\uffff";
    static final String DFA74_maxS =
        "\1\u00a1\1\0\42\uffff";
    static final String DFA74_acceptS =
        "\2\uffff\1\2\40\uffff\1\1";
    static final String DFA74_specialS =
        "\1\uffff\1\0\42\uffff}>";
    static final String[] DFA74_transitionS = {
            "\4\2\2\uffff\1\2\1\uffff\2\2\2\uffff\1\2\1\1\1\2\2\uffff\13"+
            "\2\37\uffff\1\2\1\uffff\1\2\1\uffff\1\2\2\uffff\1\2\11\uffff"+
            "\2\2\2\uffff\2\2\6\uffff\2\2\66\uffff\2\2\5\uffff\1\2\3\uffff"+
            "\3\2",
            "\1\uffff",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
    };

    static final short[] DFA74_eot = DFA.unpackEncodedString(DFA74_eotS);
    static final short[] DFA74_eof = DFA.unpackEncodedString(DFA74_eofS);
    static final char[] DFA74_min = DFA.unpackEncodedStringToUnsignedChars(DFA74_minS);
    static final char[] DFA74_max = DFA.unpackEncodedStringToUnsignedChars(DFA74_maxS);
    static final short[] DFA74_accept = DFA.unpackEncodedString(DFA74_acceptS);
    static final short[] DFA74_special = DFA.unpackEncodedString(DFA74_specialS);
    static final short[][] DFA74_transition;

    static {
        int numStates = DFA74_transitionS.length;
        DFA74_transition = new short[numStates][];
        for (int i=0; i<numStates; i++) {
            DFA74_transition[i] = DFA.unpackEncodedString(DFA74_transitionS[i]);
        }
    }

    class DFA74 extends DFA {

        public DFA74(BaseRecognizer recognizer) {
            this.recognizer = recognizer;
            this.decisionNumber = 74;
            this.eot = DFA74_eot;
            this.eof = DFA74_eof;
            this.min = DFA74_min;
            this.max = DFA74_max;
            this.accept = DFA74_accept;
            this.special = DFA74_special;
            this.transition = DFA74_transition;
        }
        public String getDescription() {
            return "1517:1: sourceElement options {k=1; } : ({...}? functionDeclaration | statement );";
        }
        public int specialStateTransition(int s, IntStream _input) throws NoViableAltException {
            TokenStream input = (TokenStream)_input;
        	int _s = s;
            switch ( s ) {
                    case 0 : 
                        int LA74_1 = input.LA(1);

                         
                        int index74_1 = input.index();
                        input.rewind();
                        s = -1;
                        if ( (( input.LA(1) == FUNCTION )) ) {s = 35;}

                        else if ( (true) ) {s = 2;}

                         
                        input.seek(index74_1);
                        if ( s>=0 ) return s;
                        break;
            }
            NoViableAltException nvae =
                new NoViableAltException(getDescription(), 74, _s, input);
            error(nvae);
            throw nvae;
        }
    }
 

    public static final BitSet FOLLOW_reservedWord_in_token1735 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_Identifier_in_token1740 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_punctuator_in_token1745 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_numericLiteral_in_token1750 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_StringLiteral_in_token1755 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_keyword_in_reservedWord1768 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_futureReservedWord_in_reservedWord1773 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_NULL_in_reservedWord1778 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_booleanLiteral_in_reservedWord1783 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_keyword0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_futureReservedWord0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_punctuator0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_NULL_in_literal2464 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_booleanLiteral_in_literal2469 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_numericLiteral_in_literal2474 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_StringLiteral_in_literal2479 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_RegularExpressionLiteral_in_literal2484 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_booleanLiteral0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_numericLiteral0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_THIS_in_primaryExpression3097 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_Identifier_in_primaryExpression3102 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_literal_in_primaryExpression3107 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_arrayLiteral_in_primaryExpression3112 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_objectLiteral_in_primaryExpression3117 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_primaryExpression3124 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_primaryExpression3126 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_primaryExpression3128 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LBRACK_in_arrayLiteral3152 = new BitSet(new long[]{0x8000000029221070L,0x000000003033009AL,0x0000000388300000L});
    public static final BitSet FOLLOW_arrayItem_in_arrayLiteral3156 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000090L});
    public static final BitSet FOLLOW_COMMA_in_arrayLiteral3160 = new BitSet(new long[]{0x8000000029221070L,0x000000003033009AL,0x0000000388300000L});
    public static final BitSet FOLLOW_arrayItem_in_arrayLiteral3162 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000090L});
    public static final BitSet FOLLOW_RBRACK_in_arrayLiteral3170 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_assignmentExpression_in_arrayItem3198 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LBRACE_in_objectLiteral3230 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000001L,0x0000000380300000L});
    public static final BitSet FOLLOW_nameValuePair_in_objectLiteral3234 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000081L});
    public static final BitSet FOLLOW_COMMA_in_objectLiteral3238 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000380300000L});
    public static final BitSet FOLLOW_nameValuePair_in_objectLiteral3240 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000081L});
    public static final BitSet FOLLOW_RBRACE_in_objectLiteral3248 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_propertyName_in_nameValuePair3273 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_nameValuePair3275 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_nameValuePair3277 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_Identifier_in_propertyName3301 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_StringLiteral_in_propertyName3306 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_numericLiteral_in_propertyName3311 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_primaryExpression_in_memberExpression3329 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_functionExpression_in_memberExpression3334 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_newExpression_in_memberExpression3339 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_NEW_in_newExpression3350 = new BitSet(new long[]{0x8000000001000070L,0x000000000000000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_primaryExpression_in_newExpression3353 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_arguments3366 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000EL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_arguments3370 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000084L});
    public static final BitSet FOLLOW_COMMA_in_arguments3374 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_arguments3376 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000084L});
    public static final BitSet FOLLOW_RPAREN_in_arguments3384 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_memberExpression_in_leftHandSideExpression3413 = new BitSet(new long[]{0x0000000000000002L,0x000000000000002AL});
    public static final BitSet FOLLOW_arguments_in_leftHandSideExpression3429 = new BitSet(new long[]{0x0000000000000002L,0x000000000000002AL});
    public static final BitSet FOLLOW_LBRACK_in_leftHandSideExpression3450 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_leftHandSideExpression3452 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000010L});
    public static final BitSet FOLLOW_RBRACK_in_leftHandSideExpression3454 = new BitSet(new long[]{0x0000000000000002L,0x000000000000002AL});
    public static final BitSet FOLLOW_DOT_in_leftHandSideExpression3473 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_leftHandSideExpression3475 = new BitSet(new long[]{0x0000000000000002L,0x000000000000002AL});
    public static final BitSet FOLLOW_leftHandSideExpression_in_postfixExpression3510 = new BitSet(new long[]{0x0000000000000002L,0x0000000000300000L});
    public static final BitSet FOLLOW_postfixOperator_in_postfixExpression3516 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_INC_in_postfixOperator3534 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_DEC_in_postfixOperator3543 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_postfixExpression_in_unaryExpression3560 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_unaryOperator_in_unaryExpression3565 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_unaryExpression_in_unaryExpression3568 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_DELETE_in_unaryOperator3580 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_VOID_in_unaryOperator3585 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_TYPEOF_in_unaryOperator3590 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_INC_in_unaryOperator3595 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_DEC_in_unaryOperator3600 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_ADD_in_unaryOperator3607 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_SUB_in_unaryOperator3616 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_INV_in_unaryOperator3623 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_NOT_in_unaryOperator3628 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_unaryExpression_in_multiplicativeExpression3643 = new BitSet(new long[]{0x0000000000000002L,0x00002000000C0000L});
    public static final BitSet FOLLOW_set_in_multiplicativeExpression3647 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_unaryExpression_in_multiplicativeExpression3662 = new BitSet(new long[]{0x0000000000000002L,0x00002000000C0000L});
    public static final BitSet FOLLOW_multiplicativeExpression_in_additiveExpression3680 = new BitSet(new long[]{0x0000000000000002L,0x0000000000030000L});
    public static final BitSet FOLLOW_set_in_additiveExpression3684 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_multiplicativeExpression_in_additiveExpression3695 = new BitSet(new long[]{0x0000000000000002L,0x0000000000030000L});
    public static final BitSet FOLLOW_additiveExpression_in_shiftExpression3714 = new BitSet(new long[]{0x0000000000000002L,0x0000000001C00000L});
    public static final BitSet FOLLOW_set_in_shiftExpression3718 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_additiveExpression_in_shiftExpression3733 = new BitSet(new long[]{0x0000000000000002L,0x0000000001C00000L});
    public static final BitSet FOLLOW_shiftExpression_in_relationalExpression3752 = new BitSet(new long[]{0x0000000000180002L,0x0000000000000F00L});
    public static final BitSet FOLLOW_set_in_relationalExpression3756 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_shiftExpression_in_relationalExpression3783 = new BitSet(new long[]{0x0000000000180002L,0x0000000000000F00L});
    public static final BitSet FOLLOW_shiftExpression_in_relationalExpressionNoIn3797 = new BitSet(new long[]{0x0000000000100002L,0x0000000000000F00L});
    public static final BitSet FOLLOW_set_in_relationalExpressionNoIn3801 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_shiftExpression_in_relationalExpressionNoIn3824 = new BitSet(new long[]{0x0000000000100002L,0x0000000000000F00L});
    public static final BitSet FOLLOW_relationalExpression_in_equalityExpression3843 = new BitSet(new long[]{0x0000000000000002L,0x000000000000F000L});
    public static final BitSet FOLLOW_set_in_equalityExpression3847 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_relationalExpression_in_equalityExpression3866 = new BitSet(new long[]{0x0000000000000002L,0x000000000000F000L});
    public static final BitSet FOLLOW_relationalExpressionNoIn_in_equalityExpressionNoIn3880 = new BitSet(new long[]{0x0000000000000002L,0x000000000000F000L});
    public static final BitSet FOLLOW_set_in_equalityExpressionNoIn3884 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_relationalExpressionNoIn_in_equalityExpressionNoIn3903 = new BitSet(new long[]{0x0000000000000002L,0x000000000000F000L});
    public static final BitSet FOLLOW_equalityExpression_in_bitwiseANDExpression3923 = new BitSet(new long[]{0x0000000000000002L,0x0000000002000000L});
    public static final BitSet FOLLOW_AND_in_bitwiseANDExpression3927 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_equalityExpression_in_bitwiseANDExpression3930 = new BitSet(new long[]{0x0000000000000002L,0x0000000002000000L});
    public static final BitSet FOLLOW_equalityExpressionNoIn_in_bitwiseANDExpressionNoIn3944 = new BitSet(new long[]{0x0000000000000002L,0x0000000002000000L});
    public static final BitSet FOLLOW_AND_in_bitwiseANDExpressionNoIn3948 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_equalityExpressionNoIn_in_bitwiseANDExpressionNoIn3951 = new BitSet(new long[]{0x0000000000000002L,0x0000000002000000L});
    public static final BitSet FOLLOW_bitwiseANDExpression_in_bitwiseXORExpression3967 = new BitSet(new long[]{0x0000000000000002L,0x0000000008000000L});
    public static final BitSet FOLLOW_XOR_in_bitwiseXORExpression3971 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseANDExpression_in_bitwiseXORExpression3974 = new BitSet(new long[]{0x0000000000000002L,0x0000000008000000L});
    public static final BitSet FOLLOW_bitwiseANDExpressionNoIn_in_bitwiseXORExpressionNoIn3990 = new BitSet(new long[]{0x0000000000000002L,0x0000000008000000L});
    public static final BitSet FOLLOW_XOR_in_bitwiseXORExpressionNoIn3994 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseANDExpressionNoIn_in_bitwiseXORExpressionNoIn3997 = new BitSet(new long[]{0x0000000000000002L,0x0000000008000000L});
    public static final BitSet FOLLOW_bitwiseXORExpression_in_bitwiseORExpression4012 = new BitSet(new long[]{0x0000000000000002L,0x0000000004000000L});
    public static final BitSet FOLLOW_OR_in_bitwiseORExpression4016 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseXORExpression_in_bitwiseORExpression4019 = new BitSet(new long[]{0x0000000000000002L,0x0000000004000000L});
    public static final BitSet FOLLOW_bitwiseXORExpressionNoIn_in_bitwiseORExpressionNoIn4034 = new BitSet(new long[]{0x0000000000000002L,0x0000000004000000L});
    public static final BitSet FOLLOW_OR_in_bitwiseORExpressionNoIn4038 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseXORExpressionNoIn_in_bitwiseORExpressionNoIn4041 = new BitSet(new long[]{0x0000000000000002L,0x0000000004000000L});
    public static final BitSet FOLLOW_bitwiseORExpression_in_logicalANDExpression4060 = new BitSet(new long[]{0x0000000000000002L,0x0000000040000000L});
    public static final BitSet FOLLOW_LAND_in_logicalANDExpression4064 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseORExpression_in_logicalANDExpression4067 = new BitSet(new long[]{0x0000000000000002L,0x0000000040000000L});
    public static final BitSet FOLLOW_bitwiseORExpressionNoIn_in_logicalANDExpressionNoIn4081 = new BitSet(new long[]{0x0000000000000002L,0x0000000040000000L});
    public static final BitSet FOLLOW_LAND_in_logicalANDExpressionNoIn4085 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_bitwiseORExpressionNoIn_in_logicalANDExpressionNoIn4088 = new BitSet(new long[]{0x0000000000000002L,0x0000000040000000L});
    public static final BitSet FOLLOW_logicalANDExpression_in_logicalORExpression4103 = new BitSet(new long[]{0x0000000000000002L,0x0000000080000000L});
    public static final BitSet FOLLOW_LOR_in_logicalORExpression4107 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_logicalANDExpression_in_logicalORExpression4110 = new BitSet(new long[]{0x0000000000000002L,0x0000000080000000L});
    public static final BitSet FOLLOW_logicalANDExpressionNoIn_in_logicalORExpressionNoIn4125 = new BitSet(new long[]{0x0000000000000002L,0x0000000080000000L});
    public static final BitSet FOLLOW_LOR_in_logicalORExpressionNoIn4129 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_logicalANDExpressionNoIn_in_logicalORExpressionNoIn4132 = new BitSet(new long[]{0x0000000000000002L,0x0000000080000000L});
    public static final BitSet FOLLOW_logicalORExpression_in_conditionalExpression4151 = new BitSet(new long[]{0x0000000000000002L,0x0000000100000000L});
    public static final BitSet FOLLOW_QUE_in_conditionalExpression4155 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_conditionalExpression4158 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_conditionalExpression4160 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_conditionalExpression4163 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_logicalORExpressionNoIn_in_conditionalExpressionNoIn4177 = new BitSet(new long[]{0x0000000000000002L,0x0000000100000000L});
    public static final BitSet FOLLOW_QUE_in_conditionalExpressionNoIn4181 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_conditionalExpressionNoIn4184 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_conditionalExpressionNoIn4186 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_conditionalExpressionNoIn4189 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_conditionalExpression_in_assignmentExpression4217 = new BitSet(new long[]{0x0000000000000002L,0x00005FFC00000000L});
    public static final BitSet FOLLOW_assignmentOperator_in_assignmentExpression4224 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_assignmentExpression4227 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_set_in_assignmentOperator0 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_conditionalExpressionNoIn_in_assignmentExpressionNoIn4304 = new BitSet(new long[]{0x0000000000000002L,0x00005FFC00000000L});
    public static final BitSet FOLLOW_assignmentOperator_in_assignmentExpressionNoIn4311 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_assignmentExpressionNoIn4314 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_assignmentExpression_in_expression4336 = new BitSet(new long[]{0x0000000000000002L,0x0000000000000080L});
    public static final BitSet FOLLOW_COMMA_in_expression4340 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_expression4344 = new BitSet(new long[]{0x0000000000000002L,0x0000000000000080L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_expressionNoIn4381 = new BitSet(new long[]{0x0000000000000002L,0x0000000000000080L});
    public static final BitSet FOLLOW_COMMA_in_expressionNoIn4385 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_expressionNoIn4389 = new BitSet(new long[]{0x0000000000000002L,0x0000000000000080L});
    public static final BitSet FOLLOW_SEMIC_in_semic4440 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_EOF_in_semic4445 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_RBRACE_in_semic4450 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_EOL_in_semic4457 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_MultiLineComment_in_semic4461 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_block_in_statement4490 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_statementTail_in_statement4495 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_variableStatement_in_statementTail4507 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_emptyStatement_in_statementTail4512 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_expressionStatement_in_statementTail4517 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_ifStatement_in_statementTail4522 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_iterationStatement_in_statementTail4527 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_continueStatement_in_statementTail4532 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_breakStatement_in_statementTail4537 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_returnStatement_in_statementTail4542 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_withStatement_in_statementTail4547 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_labelledStatement_in_statementTail4552 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_switchStatement_in_statementTail4557 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_throwStatement_in_statementTail4562 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_tryStatement_in_statementTail4567 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LBRACE_in_block4582 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004BL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_block4584 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004BL,0x0000000388300000L});
    public static final BitSet FOLLOW_RBRACE_in_block4587 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_VAR_in_variableStatement4616 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_variableDeclaration_in_variableStatement4618 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_COMMA_in_variableStatement4622 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_variableDeclaration_in_variableStatement4624 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_variableStatement4629 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_Identifier_in_variableDeclaration4652 = new BitSet(new long[]{0x0000000000000002L,0x0000000400000000L});
    public static final BitSet FOLLOW_ASSIGN_in_variableDeclaration4656 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpression_in_variableDeclaration4659 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_Identifier_in_variableDeclarationNoIn4674 = new BitSet(new long[]{0x0000000000000002L,0x0000000400000000L});
    public static final BitSet FOLLOW_ASSIGN_in_variableDeclarationNoIn4678 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_assignmentExpressionNoIn_in_variableDeclarationNoIn4681 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_SEMIC_in_emptyStatement4700 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_expression_in_expressionStatement4719 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_expressionStatement4721 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_IF_in_ifStatement4739 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_ifStatement4741 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_ifStatement4743 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_ifStatement4745 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_ifStatement4747 = new BitSet(new long[]{0x0000000000004002L});
    public static final BitSet FOLLOW_ELSE_in_ifStatement4753 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_ifStatement4755 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_doStatement_in_iterationStatement4788 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_whileStatement_in_iterationStatement4793 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_forStatement_in_iterationStatement4798 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_DO_in_doStatement4810 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_doStatement4812 = new BitSet(new long[]{0x0000000040000000L});
    public static final BitSet FOLLOW_WHILE_in_doStatement4814 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_doStatement4816 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_doStatement4818 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_doStatement4820 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_doStatement4822 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_WHILE_in_whileStatement4847 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_whileStatement4850 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_whileStatement4853 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_whileStatement4855 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_whileStatement4858 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_FOR_in_forStatement4871 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_forStatement4874 = new BitSet(new long[]{0x8000000039221070L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_forControl_in_forStatement4877 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_forStatement4879 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_forStatement4882 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_forControlVar_in_forControl4893 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_forControlExpression_in_forControl4898 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_forControlSemic_in_forControl4903 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_VAR_in_forControlVar4914 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_variableDeclarationNoIn_in_forControlVar4916 = new BitSet(new long[]{0x0000000000080000L,0x00000000000000C0L});
    public static final BitSet FOLLOW_IN_in_forControlVar4928 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlVar4930 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_COMMA_in_forControlVar4976 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_variableDeclarationNoIn_in_forControlVar4978 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C0L});
    public static final BitSet FOLLOW_SEMIC_in_forControlVar4983 = new BitSet(new long[]{0x8000000029221070L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlVar4987 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000040L});
    public static final BitSet FOLLOW_SEMIC_in_forControlVar4990 = new BitSet(new long[]{0x8000000029221072L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlVar4994 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_expressionNoIn_in_forControlExpression5060 = new BitSet(new long[]{0x0000000000080000L,0x0000000000000040L});
    public static final BitSet FOLLOW_IN_in_forControlExpression5075 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlExpression5079 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_SEMIC_in_forControlExpression5125 = new BitSet(new long[]{0x8000000029221070L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlExpression5129 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000040L});
    public static final BitSet FOLLOW_SEMIC_in_forControlExpression5132 = new BitSet(new long[]{0x8000000029221072L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlExpression5136 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_SEMIC_in_forControlSemic5195 = new BitSet(new long[]{0x8000000029221070L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlSemic5199 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000040L});
    public static final BitSet FOLLOW_SEMIC_in_forControlSemic5202 = new BitSet(new long[]{0x8000000029221072L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_forControlSemic5206 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_CONTINUE_in_continueStatement5260 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000160000L});
    public static final BitSet FOLLOW_Identifier_in_continueStatement5265 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_continueStatement5268 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_BREAK_in_breakStatement5287 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000160000L});
    public static final BitSet FOLLOW_Identifier_in_breakStatement5292 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_breakStatement5295 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_RETURN_in_returnStatement5314 = new BitSet(new long[]{0x8000000029221070L,0x00000000303300CBL,0x0000000388360000L});
    public static final BitSet FOLLOW_expression_in_returnStatement5319 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_returnStatement5322 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_WITH_in_withStatement5339 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_withStatement5342 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_withStatement5345 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_withStatement5347 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_withStatement5350 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_SWITCH_in_switchStatement5371 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_switchStatement5373 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_switchStatement5375 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_switchStatement5377 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_LBRACE_in_switchStatement5379 = new BitSet(new long[]{0x0000000000000900L,0x0000000000000001L});
    public static final BitSet FOLLOW_defaultClause_in_switchStatement5386 = new BitSet(new long[]{0x0000000000000900L,0x0000000000000001L});
    public static final BitSet FOLLOW_caseClause_in_switchStatement5392 = new BitSet(new long[]{0x0000000000000900L,0x0000000000000001L});
    public static final BitSet FOLLOW_RBRACE_in_switchStatement5397 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_CASE_in_caseClause5425 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_caseClause5428 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_caseClause5430 = new BitSet(new long[]{0x80000000FFE734F2L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_caseClause5433 = new BitSet(new long[]{0x80000000FFE734F2L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_DEFAULT_in_defaultClause5446 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_defaultClause5449 = new BitSet(new long[]{0x80000000FFE734F2L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_defaultClause5452 = new BitSet(new long[]{0x80000000FFE734F2L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_Identifier_in_labelledStatement5469 = new BitSet(new long[]{0x0000000000000000L,0x0000000200000000L});
    public static final BitSet FOLLOW_COLON_in_labelledStatement5471 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_statement_in_labelledStatement5473 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_THROW_in_throwStatement5504 = new BitSet(new long[]{0x8000000029221070L,0x000000003033000AL,0x0000000388300000L});
    public static final BitSet FOLLOW_expression_in_throwStatement5509 = new BitSet(new long[]{0x0000000000000000L,0x00000000000000C1L,0x0000000000060000L});
    public static final BitSet FOLLOW_semic_in_throwStatement5511 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_TRY_in_tryStatement5528 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_block_in_tryStatement5531 = new BitSet(new long[]{0x0000000000008200L});
    public static final BitSet FOLLOW_catchClause_in_tryStatement5535 = new BitSet(new long[]{0x0000000000008202L});
    public static final BitSet FOLLOW_finallyClause_in_tryStatement5537 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_finallyClause_in_tryStatement5542 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_CATCH_in_catchClause5556 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_catchClause5559 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_catchClause5562 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L});
    public static final BitSet FOLLOW_RPAREN_in_catchClause5564 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_block_in_catchClause5567 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_FINALLY_in_finallyClause5579 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_block_in_finallyClause5582 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_FUNCTION_in_functionDeclaration5603 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_functionDeclaration5607 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_formalParameterList_in_functionDeclaration5609 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_functionBody_in_functionDeclaration5611 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_FUNCTION_in_functionExpression5638 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_functionExpression5642 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000002L});
    public static final BitSet FOLLOW_formalParameterList_in_functionExpression5645 = new BitSet(new long[]{0x8000000000000000L});
    public static final BitSet FOLLOW_functionBody_in_functionExpression5647 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LPAREN_in_formalParameterList5675 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000004L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_formalParameterList5679 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000084L});
    public static final BitSet FOLLOW_COMMA_in_formalParameterList5683 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000000L,0x0000000000100000L});
    public static final BitSet FOLLOW_Identifier_in_formalParameterList5685 = new BitSet(new long[]{0x0000000000000000L,0x0000000000000084L});
    public static final BitSet FOLLOW_RPAREN_in_formalParameterList5693 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_LBRACE_in_functionBody5718 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004BL,0x0000000388300000L});
    public static final BitSet FOLLOW_sourceElement_in_functionBody5720 = new BitSet(new long[]{0x80000000FFE734F0L,0x000000003033004BL,0x0000000388300000L});
    public static final BitSet FOLLOW_RBRACE_in_functionBody5723 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_sourceElement_in_program5752 = new BitSet(new long[]{0x80000000FFE734F2L,0x000000003033004AL,0x0000000388300000L});
    public static final BitSet FOLLOW_functionDeclaration_in_sourceElement5781 = new BitSet(new long[]{0x0000000000000002L});
    public static final BitSet FOLLOW_statement_in_sourceElement5786 = new BitSet(new long[]{0x0000000000000002L});

}