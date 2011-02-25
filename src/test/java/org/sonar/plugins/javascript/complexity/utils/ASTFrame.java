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

package org.sonar.plugins.javascript.complexity.utils;

import java.awt.BorderLayout;
import java.awt.Container;
import java.awt.Frame;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

import javax.swing.JFrame;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTree;

import org.antlr.runtime.tree.CommonTree;

/**
 * @author Jörg Werner
 * 
 */
public class ASTFrame extends JFrame {

	private static final long serialVersionUID = -92059391014955313L;

	public ASTFrame(String lab, CommonTree t) {
		super(lab);

		JTree tree = new JTree(new ASTtoTreeModelAdapter(t));

		JScrollPane scrollPane = new JScrollPane(tree);

		JPanel panel = new JPanel();
		panel.setLayout(new BorderLayout());
		panel.add(scrollPane);

		Container content = getContentPane();
		content.add(panel, BorderLayout.CENTER);

		addWindowListener(new WindowAdapter() {
			public void windowClosing(WindowEvent e) {
				Frame f = (Frame) e.getSource();
				f.setVisible(false);
				f.dispose();
				// System.exit(0);
			}
		});
	}

}
